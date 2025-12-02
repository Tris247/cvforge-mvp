Param(
  [string]$tag = "v$(Get-Date -Format 'yyyyMMddHHmm')"
)

Write-Host "Preparing release $tag"

if(Test-Path .env){ Write-Host "Ensure .env has DATABASE_URL and other secrets set" }

Write-Host "Running prisma migrate deploy..."
npx prisma migrate deploy

Write-Host "Seeding demo data..."
node prisma/seed.js

Write-Host "Building docker image..."
docker build -t cvforge-mvp:$tag .
Write-Host "Release build complete: cvforge-mvp:$tag"
