@echo off
REM start.bat - Inicia Docker Compose y guarda logs de la sesion
REM Uso: start.bat

setlocal enabledelayedexpansion

REM Crear carpeta de logs con timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set datetime=%%I
set "timestamp=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%"
set "logDir=logs\%timestamp%"

mkdir "%logDir%" 2>nul

echo ========================================
echo   TRANSA-LOGISTICS - Sesion: %timestamp%
echo   Logs guardados en: %logDir%
echo ========================================
echo.

echo [1/2] Levantando contenedores...
docker compose up -d --build > "%logDir%\startup.log" 2>&1

echo [2/2] Esperando servicios...
timeout /t 10 /nobreak >nul

echo.
echo Capturando logs... (presiona Ctrl+C para detener)
echo   Todos:     %logDir%\docker-all.log
echo   Backend:   %logDir%\docker-backend.log
echo   Frontend:  %logDir%\docker-frontend.log
echo   Database:  %logDir%\docker-db.log
echo.

REM Capturar logs en background usando PowerShell
start "Logs-All" /min powershell -Command "docker compose logs --tail=0 -f 2>&1 | Out-File -FilePath '%logDir%\docker-all.log' -Encoding utf8 -Append"
start "Logs-Backend" /min powershell -Command "docker compose logs --tail=0 -f backend 2>&1 | Out-File -FilePath '%logDir%\docker-backend.log' -Encoding utf8 -Append"
start "Logs-Frontend" /min powershell -Command "docker compose logs --tail=0 -f frontend 2>&1 | Out-File -FilePath '%logDir%\docker-frontend.log' -Encoding utf8 -Append"
start "Logs-DB" /min powershell -Command "docker compose logs --tail=0 -f db 2>&1 | Out-File -FilePath '%logDir%\docker-db.log' -Encoding utf8 -Append"

echo Sesion activa. Logs guardando en: %logDir%
echo Presiona Ctrl+C para detener la captura.
echo.

REM Mantener el script abierto
pause >nul
