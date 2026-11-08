# Start FastAPI InsightFace AI Service on port 8001
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Starting AI Service (FastAPI on Port 8001)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AiDir = Resolve-Path "$ScriptDir\..\ai-services"

Set-Location $AiDir

# Check for Python virtual environment
if (Test-Path "$AiDir\venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtualenv (venv)..." -ForegroundColor Yellow
    & "$AiDir\venv\Scripts\Activate.ps1"
} elseif (Test-Path "$AiDir\.venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtualenv (.venv)..." -ForegroundColor Yellow
    & "$AiDir\.venv\Scripts\Activate.ps1"
}

# Check if insightface is installed
$insightInstalled = python -c "import insightface" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "InsightFace not detected. Installing precompiled wheel for Windows Python 3.12..." -ForegroundColor Yellow
    pip install https://github.com/Gourieff/Assets/raw/main/Insightface/insightface-0.7.3-cp312-cp312-win_amd64.whl
    pip install -r requirements.txt
}

Write-Host "Starting Uvicorn server on port 8001..." -ForegroundColor Green
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
