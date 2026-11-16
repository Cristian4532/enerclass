@echo off
setlocal EnableExtensions
title EnerClass - Servidor de produccion
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js no esta disponible en este equipo.
  echo Instale Node.js 18 o superior y vuelva a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\next\package.json" (
  echo.
  echo Instalando dependencias de EnerClass...
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 goto error
)

if not exist "prisma\dev.db" (
  echo.
  echo Creando y poblando la base de datos de demostracion...
  call npm.cmd run setup
  if errorlevel 1 goto error
)

if not exist ".next\BUILD_ID" (
  echo.
  echo Compilando la version de produccion por primera vez...
  call npm.cmd run build
  if errorlevel 1 goto error
)

echo.
echo ============================================================
echo   EnerClass PRODUCCION
echo   Local:  http://localhost:3000
echo   Red:    consulte el banner azul en la pantalla de login
echo   No cierre esta ventana mientras use el sistema.
echo ============================================================
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process 'http://localhost:3000'"

rem Limita el heap de Node para laptops basicas de 4 GB de RAM.
set "NODE_OPTIONS=--max-old-space-size=1024"
call npm.cmd run start
goto end

:error
echo.
echo No se pudo iniciar EnerClass. Revise los mensajes anteriores.
pause

:end
endlocal
