<#
Run-migrate-postgres.ps1

Starts the `db` service from `docker-compose.yml`, waits until Postgres is ready,
generates the Postgres Prisma client, runs the migration script (with `--force`),
and then runs a verification script that prints counts from the Postgres DB.

Usage (PowerShell):
  .\scripts\run-migrate-postgres.ps1

Notes:
 - Requires Docker Desktop / docker-compose on the machine running this script.
 - The script uses the Postgres credentials defined in `docker-compose.yml`:
     user: postgres, password: postgres, db: cvforge_dev
 - This will perform writes to the Postgres DB. Back up data if needed.
#>

param(
  [switch]$TearDownAfter = $false,
  [switch]$AutoFix = $false
)

function ExitWith($code, $message) {
  if ($message) { Write-Error $message }
  exit $code
}

# Try to locate the Docker CLI. If it's not on PATH, check common install locations
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd -and $AutoFix) {
  Write-Output "Attempting AutoFix: will try adding Docker CLI folder to User PATH and (if running as Administrator) start the Docker service."
  $dockerBin = 'C:\Program Files\Docker\Docker\resources\bin'
  # Add to User PATH permanently (idempotent)
  try {
    $currentUserPath = [Environment]::GetEnvironmentVariable('PATH','User')
    if (-not ($currentUserPath -split ';' | Where-Object { $_ -eq $dockerBin })) {
      $newUserPath = if ($currentUserPath) { "$currentUserPath;$dockerBin" } else { $dockerBin }
      [Environment]::SetEnvironmentVariable('PATH', $newUserPath, 'User')
      Write-Output "Added $dockerBin to User PATH. Close and reopen terminals/VS Code to pick it up for new sessions."
    } else {
      Write-Output "$dockerBin already present in User PATH."
    }
  } catch {
    Write-Output "Failed to update User PATH: $_"
  }

  # If running as admin, attempt to start the Docker Windows service
  $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if ($isAdmin) {
    try {
      Start-Service com.docker.service -ErrorAction Stop
      Write-Output "Started Docker service (com.docker.service)."
    } catch {
      Write-Output "Could not start Docker service automatically: $_"
    }
  } else {
    Write-Output "Not running as Administrator — cannot start Docker service automatically. Re-run PowerShell as Administrator to allow service start."
  }

  # Try locating docker again after attempted fixes
  $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
}
if (-not $dockerCmd) {
  $possible = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
  if (Test-Path $possible) {
    Write-Output "Found docker.exe at $possible; adding its folder to PATH for this session."
    $env:PATH = $env:PATH + ";" + (Split-Path $possible)
    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
  }
}
if (-not $dockerCmd) {
  $svc = Get-Service -Name com.docker.service -ErrorAction SilentlyContinue
  $svcState = if ($svc) { $svc.Status } else { "not-found" }
  ExitWith 1 "Docker CLI not found. Docker Desktop may not be installed or the CLI is not on PATH. Service state: $svcState. Ensure Docker Desktop is running, WSL2 integration is enabled, and restart your terminal/VS Code. If docker is installed in a non-standard location, add it to your PATH and re-run this script."
}

Write-Output "Starting Postgres service via docker compose..."
docker compose up -d db
if ($LASTEXITCODE -ne 0) { ExitWith 2 "Failed to start Postgres via docker compose." }

Write-Output "Waiting for Postgres on localhost:5432 to become ready..."
$maxAttempts = 60
for ($i=0; $i -lt $maxAttempts; $i++) {
  $conn = Test-NetConnection -ComputerName 'localhost' -Port 5432 -WarningAction SilentlyContinue
  if ($conn.TcpTestSucceeded) { Write-Output "Postgres TCP port is open."; break }
  Start-Sleep -Seconds 2
  Write-Output "Waiting... ($($i+1)/$maxAttempts)"
}
if (-not $conn.TcpTestSucceeded) { ExitWith 3 "Postgres did not become reachable on localhost:5432 within timeout." }

Write-Output "Generating Postgres Prisma client..."
npx prisma generate --schema=prisma/schema.postgres.prisma
if ($LASTEXITCODE -ne 0) { ExitWith 4 "Prisma generate failed." }

# Set DATABASE_URL for the migration run (matches docker-compose.yml)
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/cvforge_dev'

Write-Output "Running migration script (this performs writes)."
Write-Output "If you did not intend to run writes, cancel now (Ctrl+C)."
Start-Sleep -Seconds 2

npx cross-env DATABASE_URL="$env:DATABASE_URL" node .\scripts\migrate-sqlite-to-postgres.js --force
if ($LASTEXITCODE -ne 0) { ExitWith 5 "Migration script failed. Check output above." }

Write-Output "Migration finished — running verification script to print table counts..."
node .\scripts\verify-postgres.js

if ($TearDownAfter) {
  Write-Output "Tearing down Postgres container..."
  docker compose down
}

Write-Output "Done."
