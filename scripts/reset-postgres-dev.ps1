<#
reset-postgres-dev.ps1

Creates a Postgres development schema from `prisma/schema.postgres.prisma`,
generates the Prisma client, imports demo JSON data, and runs verification.

Usage (PowerShell):
  .\scripts\reset-postgres-dev.ps1       # default: backup migrations, run push+import
  .\scripts\reset-postgres-dev.ps1 -NoBackup  # skip backing up migrations

This is intended for local development only.
#>

param(
  [switch]$NoBackup = $false
)

function Write-ErrAndExit($msg, $code=1) {
  Write-Error $msg
  exit $code
}

Write-Output "Starting Postgres dev reset (this operates on DATABASE_URL -> postgres://postgres:postgres@localhost:5432/cvforge_dev)"

# Set DATABASE_URL for this session (matches docker-compose.yml)
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/cvforge_dev'

if (-not $NoBackup) {
  if (Test-Path prisma\migrations) {
    $ts = (Get-Date).ToString('yyyyMMddHHmmss')
    $dest = "prisma\migrations.sqlite-backup-$ts"
    Write-Output "Backing up existing migrations to $dest"
    try {
      Rename-Item -Path prisma\migrations -NewName $dest -ErrorAction Stop
    } catch {
      Write-ErrAndExit "Failed to backup migrations: $_"
    }
  }
  if (Test-Path prisma\migration_lock.toml) {
    $lockDest = "prisma\migration_lock.toml.sqlite-backup"
    Write-Output "Backing up migration_lock.toml to $lockDest"
    try { Rename-Item -Path prisma\migration_lock.toml -NewName $lockDest -ErrorAction Stop } catch { Write-Output "No migration_lock.toml to backup" }
  }
}

Write-Output "Running: prisma db push --schema=prisma/schema.postgres.prisma"
npx prisma db push --schema=prisma/schema.postgres.prisma
if ($LASTEXITCODE -ne 0) { Write-ErrAndExit "prisma db push failed (see output)" }

Write-Output "Generating Prisma client"
npx prisma generate --schema=prisma/schema.postgres.prisma
if ($LASTEXITCODE -ne 0) { Write-ErrAndExit "prisma generate failed" }

Write-Output "Importing demo JSON data (this may take a moment)"
node .\scripts\migrate-json-to-postgres.js --force
if ($LASTEXITCODE -ne 0) { Write-ErrAndExit "JSON importer failed" }

Write-Output "Running Postgres verification"
node .\scripts\verify-postgres.js
if ($LASTEXITCODE -ne 0) { Write-ErrAndExit "Verification script failed" }

Write-Output "Postgres dev reset complete."
