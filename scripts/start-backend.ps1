# Start Spring Boot Core API on port 8080
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Starting Spring Boot API (Port 8080)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Resolve-Path "$ScriptDir\..\backend\SnapRoom\SnapRoom"

Set-Location $BackendDir

Write-Host "Booting SnapRoom Application via Maven Wrapper..." -ForegroundColor Green
./mvnw.cmd spring-boot:run

