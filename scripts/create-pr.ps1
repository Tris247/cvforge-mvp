param(
  [string]$Branch = "feat/postgres-ci-migration",
  [string]$Message = "ci: add Postgres CI workflow and harden migration tooling",
  [switch]$CreatePR
)

function FindCommand([string]$name, [string[]]$fallbackPaths){
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach($p in $fallbackPaths){ if (Test-Path $p) { return $p } }
  return $null
}

Write-Host "Create PR helper — branch: $Branch"

$gitPath = FindCommand 'git' @(
  "$Env:ProgramFiles\Git\cmd\git.exe",
  "$Env:ProgramFiles(x86)\Git\cmd\git.exe",
  "$Env:USERPROFILE\AppData\Local\Programs\Git\cmd\git.exe",
  'C:\Program Files\Git\cmd\git.exe'
)
if (-not $gitPath) {
  Write-Host "Git is not installed or not on PATH. Please install Git for Windows and retry."
  Write-Host "Install via: https://git-scm.com/download/win or run:"
  Write-Host "  winget install --id Git.Git -e --source winget"
  exit 2
}

if (-not (Test-Path .git)) {
  Write-Error "No git repository found in current directory. Run this script from the repo root."
  exit 1
}

Write-Host "Using git at: $gitPath"
$status = & "$gitPath" status --porcelain
if ($status -ne "") {
  Write-Host "Working tree has changes. Staging all changes..."
  & "$gitPath" add -A
  & "$gitPath" commit -m $Message
} else {
  Write-Host "Working tree clean. Creating/switching branch..."
}

Write-Host "Checking out branch $Branch"
& "$gitPath" checkout -B $Branch

Write-Host "Pushing branch to origin..."
& "$gitPath" push -u origin $Branch

if ($CreatePR) {
  $ghPath = FindCommand 'gh' @(
    "$Env:ProgramFiles\GitHub CLI\bin\gh.exe",
    "$Env:USERPROFILE\AppData\Local\Programs\GitHub CLI\gh.exe",
    'C:\Program Files\GitHub CLI\bin\gh.exe'
  )
  if ($ghPath) {
    Write-Host "Creating PR via GitHub CLI at: $ghPath"
    $title = $Message
    $bodyFile = '.github/PULL_REQUEST_TEMPLATE.md'
    if (Test-Path $bodyFile) {
      & "$ghPath" pr create --title "$title" --body-file $bodyFile --base main
    } else {
      & "$ghPath" pr create --title "$title" --fill --base main
    }
  } else {
    Write-Host "GitHub CLI ('gh') not found. Create a PR manually using the URL below:"
    Write-Host "https://github.com/<your-org>/<your-repo>/compare/main...$Branch"
    Write-Host "Or install gh: winget install --id GitHub.cli -e --source winget"
  }
}

Write-Host "Done. Review the branch and open a PR if needed."
