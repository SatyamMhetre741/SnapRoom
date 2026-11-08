# Start All SnapRoom Services
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Launching Full SnapRoom Stack" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Start Database
Write-Host "[1/4] Starting PostgreSQL pgvector container..." -ForegroundColor Yellow
& "$ScriptDir\start-db.ps1"

# Give DB a brief moment to accept connections
Start-Sleep -Seconds 3

# 2. Launch AI Service in a new terminal window
Write-Host "[2/4] Launching AI Service in new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$ScriptDir\start-ai.ps1"

# 3. Launch Backend API in a new terminal window
Write-Host "[3/4] Launching Spring Boot Backend in new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$ScriptDir\start-backend.ps1"

# 4. Launch Frontend in a new terminal window
Write-Host "[4/4] Launching Next.js Frontend in new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$ScriptDir\start-frontend.ps1"

Write-Host "`nAll services have been initiated!" -ForegroundColor Green
Write-Host "  - PostgreSQL: localhost:5433" -ForegroundColor White
Write-Host "  - AI Service: http://localhost:8001" -ForegroundColor White
Write-Host "  - Backend API: http://localhost:8080" -ForegroundColor White
Write-Host "  - Frontend:   http://localhost:3000" -ForegroundColor White

