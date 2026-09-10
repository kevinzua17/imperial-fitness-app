@echo off
echo Entrando al backend...
cd backend

echo.
echo Instalando dependencias backend...
pip install -r requirements.txt

echo.
echo Ejecutando pruebas backend...
pytest

echo.
echo Validacion backend terminada.
pause
