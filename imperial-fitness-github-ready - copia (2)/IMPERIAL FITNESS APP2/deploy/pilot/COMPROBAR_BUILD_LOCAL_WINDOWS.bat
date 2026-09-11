@echo off
echo Instalando dependencias frontend...
call npm install

echo.
echo Ejecutando pruebas frontend...
call npm test

echo.
echo Compilando frontend...
call npm run build

echo.
echo Validacion frontend terminada.
pause
