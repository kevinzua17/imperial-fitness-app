@echo off
setlocal enabledelayedexpansion
echo ================================================
echo  IMPERIAL FITNESS - INSTALAR LOGO REAL PWA
echo ================================================
echo.
echo Arrastra aqui el archivo de logo PNG/JPG/WEBP y presiona ENTER:
set /p LOGO_PATH=
set LOGO_PATH=%LOGO_PATH:"=%

if not exist "%LOGO_PATH%" (
  echo.
  echo ERROR: No se encontro el archivo indicado.
  echo Ruta recibida: %LOGO_PATH%
  pause
  exit /b 1
)

python -m pip install pillow
python convertir_logo_pwa.py "%LOGO_PATH%"

if errorlevel 1 (
  echo.
  echo ERROR: No se pudo convertir el logo.
  pause
  exit /b 1
)

npm run build

echo.
echo ================================================
echo  LISTO
echo ================================================
echo Archivos creados:
echo public\logo-imperial-fitness.png
echo public\icons\icon-192.png
echo public\icons\icon-512.png
echo.
echo Verifica tambien que existan en dist despues del build.
pause