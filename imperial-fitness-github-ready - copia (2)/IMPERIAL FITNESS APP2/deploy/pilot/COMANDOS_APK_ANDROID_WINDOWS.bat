@echo off
echo Instalando dependencias...
call npm install

echo.
echo Si aun no existe carpeta android, se intentara crear...
if not exist android (
  call npm run mobile:add:android
)

echo.
echo Compilando y sincronizando Android...
call npm run mobile:build

echo.
echo Abriendo Android Studio...
call npm run mobile:android
pause
