@echo off
setlocal
title EnerClass - Restablecer datos de demostracion
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"

echo.
echo ATENCION: esta operacion elimina los usuarios, lecturas y alertas
echo actuales y vuelve a generar 30 dias de datos de demostracion.
echo.
choice /C SN /M "Desea continuar"
if errorlevel 2 goto cancel

call npm.cmd run db:seed
if errorlevel 1 (
  echo.
  echo No se pudieron regenerar los datos.
  pause
  exit /b 1
)
echo.
echo Datos de demostracion regenerados correctamente.
pause
exit /b 0

:cancel
echo Operacion cancelada.
exit /b 0
