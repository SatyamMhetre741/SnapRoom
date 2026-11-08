# Start PostgreSQL with pgvector on port 5433
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Starting PostgreSQL + pgvector (Port 5433)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\.."

Set-Location $ProjectRoot

# Start postgres container defined in docker-compose.yaml
docker compose up -d postgres

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nPostgreSQL is running on localhost:5433" -ForegroundColor Green
    Write-Host "Database: photo_sharing_db | User: postgres" -ForegroundColor Green
} else {
    Write-Host "`nFailed to start PostgreSQL with docker-compose. Attempting direct docker run..." -ForegroundColor Yellow
    docker run -d `
      --name snaproom-db `
      -p 5433:5432 `
      -e POSTGRES_USER=postgres `
      -e POSTGRES_PASSWORD=MyNewPassword123 `
      -e POSTGRES_DB=photo_sharing_db `
      -v snaproom_pgdata:/var/lib/postgresql/data `
      -v "$ProjectRoot/db/init.sql:/docker-entrypoint-initdb.d/01_init.sql:ro" `
      pgvector/pgvector:pg16
}

