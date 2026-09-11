@echo off
echo Generando SECRET_KEY segura para Imperial Fitness...
python -c "import secrets; print(secrets.token_urlsafe(64))"
echo.
echo Copia la clave generada y pegala en SECRET_KEY del backend.
pause
