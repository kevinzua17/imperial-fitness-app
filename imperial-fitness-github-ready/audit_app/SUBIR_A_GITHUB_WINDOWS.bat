@echo off
chcp 65001 >nul
cls
echo ==========================================
echo  IMPERIAL FITNESS - SUBIR A GITHUB
echo ==========================================
echo.
echo Este script subira el proyecto completo usando Git.
echo No uses GitHub Web Upload, porque falla con muchos archivos.
echo.

git --version >nul 2>&1
if errorlevel 1 (
  echo ERROR: Git no esta instalado o no esta disponible.
  echo Instala Git for Windows o GitHub Desktop y vuelve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

if not exist .git (
  echo Inicializando repositorio Git...
  git init
)

git branch -M main

echo Agregando archivos permitidos por .gitignore...
git add .

echo Creando commit...
git commit -m "Primer despliegue Imperial Fitness App" || echo No se creo commit nuevo. Puede que ya estuviera creado.

echo.
echo Pega la URL HTTPS del repositorio GitHub privado.
echo Ejemplo: https://github.com/TU_USUARIO/imperial-fitness-app.git
echo.
set /p REPO_URL=URL de GitHub: 

if "%REPO_URL%"=="" (
  echo No pegaste URL. Cancelando.
  pause
  exit /b 1
)

git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo Subiendo a GitHub...
git push -u origin main

echo.
echo ==========================================
echo  PROCESO TERMINADO
echo ==========================================
echo Si GitHub te pide iniciar sesion, acepta desde el navegador.
echo.
pause
