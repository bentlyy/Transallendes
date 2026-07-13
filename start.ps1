# start.ps1 - Inicia Docker Compose y guarda logs de la sesion
# Uso: .\start.ps1

$ErrorActionPreference = "Continue"

# Crear carpeta de logs con timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logDir = "logs\$timestamp"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TRANSA-LOGISTICS - Sesion: $timestamp" -ForegroundColor Cyan
Write-Host "  Logs guardados en: $logDir" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Guardar metadata de la sesion
@"
Sesion: $timestamp
Inicio: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Hostname: $env:COMPUTERNAME
Usuario: $env:USERNAME
"@ | Out-File -FilePath "$logDir\session-info.txt" -Encoding utf8

Write-Host "[1/3] Levantando contenedores..." -ForegroundColor Yellow
docker compose up -d --build 2>&1 | Out-File -FilePath "$logDir\startup.log" -Encoding utf8

Write-Host "[2/3] Esperando a que los servicios estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "[3/3] Capturando logs de la sesión (Ctrl+C para detener)..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Logs en tiempo real:" -ForegroundColor Green
Write-Host "  - Completo:  $logDir\docker-all.log" -ForegroundColor Gray
Write-Host "  - Backend:   $logDir\docker-backend.log" -ForegroundColor Gray
Write-Host "  - Frontend:  $logDir\docker-frontend.log" -ForegroundColor Gray
Write-Host "  - Database:  $logDir\docker-db.log" -ForegroundColor Gray
Write-Host ""
Write-Host "Presiona Ctrl+C para detener la captura de logs." -ForegroundColor Yellow
Write-Host "Los contenedores seguirán corriendo en background." -ForegroundColor Yellow
Write-Host ""

# Capturar logs de todos los contenedores en background
$allLogJob = Start-Job -ScriptBlock {
    param($logDir)
    docker compose logs --tail=0 -f 2>&1 | Out-File -FilePath "$logDir\docker-all.log" -Encoding utf8 -Append
} -ArgumentList $logDir

# Capturar logs por servicio en background
$backendLogJob = Start-Job -ScriptBlock {
    param($logDir)
    docker compose logs --tail=0 -f backend 2>&1 | Out-File -FilePath "$logDir\docker-backend.log" -Encoding utf8 -Append
} -ArgumentList $logDir

$frontendLogJob = Start-Job -ScriptBlock {
    param($logDir)
    docker compose logs --tail=0 -f frontend 2>&1 | Out-File -FilePath "$logDir\docker-frontend.log" -Encoding utf8 -Append
} -ArgumentList $logDir

$dbLogJob = Start-Job -ScriptBlock {
    param($logDir)
    docker compose logs --tail=0 -f db 2>&1 | Out-File -FilePath "$logDir\docker-db.log" -Encoding utf8 -Append
} -ArgumentList $logDir

Write-Host "Sesion activa. Los logs se están guardando en: $logDir" -ForegroundColor Green
Write-Host ""

# Esperar hasta que el usuario presione Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Write-Host "Deteniendo captura de logs..." -ForegroundColor Yellow

    # Detener jobs de background
    Stop-Job -Job $allLogJob -ErrorAction SilentlyContinue
    Stop-Job -Job $backendLogJob -ErrorAction SilentlyContinue
    Stop-Job -Job $frontendLogJob -ErrorAction SilentlyContinue
    Stop-Job -Job $dbLogJob -ErrorAction SilentlyContinue

    Remove-Job -Job $allLogJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendLogJob -ErrorAction SilentlyContinue
    Remove-Job -Job $frontendLogJob -ErrorAction SilentlyContinue
    Remove-Job -Job $dbLogJob -ErrorAction SilentlyContinue

    # Guardar estado final
    $endTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    @"
Sesion: $timestamp
Inicio: $(Get-Content "$logDir\session-info.txt" | Select-String "Inicio:" | ForEach-Object { $_.ToString().Split(": ",2)[1] })
Fin: $endTime
Estado: Detenido por usuario
"@ | Out-File -FilePath "$logDir\session-info.txt" -Encoding utf8

    # Capturar snapshot final de logs
    docker compose logs --tail=500 2>&1 | Out-File -FilePath "$logDir\docker-final-snapshot.log" -Encoding utf8

    Write-Host "Logs guardados en: $logDir" -ForegroundColor Green
    Write-Host "Los contenedores siguen corriendo. Para detenerlos: docker compose down" -ForegroundColor Yellow
}
