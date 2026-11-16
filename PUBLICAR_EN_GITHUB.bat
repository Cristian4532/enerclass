@echo off
chcp 65001 >nul
title EnerClass - Publicar en GitHub
cd /d "%~dp0"

set "GIT=C:\Program Files\Git\cmd\git.exe"
if not exist "%GIT%" set "GIT=git"

echo ============================================================
echo   PUBLICAR ENERCLASS EN GITHUB
echo ============================================================
echo.
echo 1. Abre https://github.com/new
echo 2. Nombre del repositorio: enerclass
echo 3. Dejalo VACIO: no marques README, .gitignore ni licencia.
echo 4. Copia la URL del repositorio (termina en .git).
echo.
set /p "REPO=Pega aqui la URL y presiona Enter: "
if "%REPO%"=="" (
  echo.
  echo No se ingreso ninguna URL.
  pause
  exit /b 1
)

"%GIT%" remote remove origin >nul 2>nul
"%GIT%" remote add origin "%REPO%"
if errorlevel 1 (
  echo.
  echo No se pudo configurar el repositorio remoto.
  pause
  exit /b 1
)

"%GIT%" branch -M main
echo.
echo Subiendo archivos... Se abrira una ventana para iniciar sesion en GitHub.
"%GIT%" push -u origin main
if errorlevel 1 (
  echo.
  echo No se pudo completar la subida. Revisa la URL y tus credenciales.
  pause
  exit /b 1
)

echo.
echo Listo. El proyecto ya esta publicado en:
echo %REPO%
echo.
pause
