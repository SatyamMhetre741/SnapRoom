# Start Next.js Frontend on port 3000
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Starting Next.js Frontend (Port 3000)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Resolve-Path "$ScriptDir\..\frontend"

Set-Location $FrontendDir

if (-not (Test-Path "$FrontendDir\node_modules")) {
    Write-Host "node_modules not found. Running npm install..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting Next.js dev server..." -ForegroundColor Green
npm run dev

