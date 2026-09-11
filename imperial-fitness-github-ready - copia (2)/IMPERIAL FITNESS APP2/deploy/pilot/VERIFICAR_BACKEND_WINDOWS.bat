@echo off
set /p API_URL=Escribe la URL del backend, por ejemplo https://imperial-fitness-api.onrender.com: 
echo.
echo Probando %API_URL%/health
powershell -Command "try { Invoke-RestMethod '%API_URL%/health' } catch { Write-Host 'ERROR:' $_.Exception.Message }"
echo.
echo Probando %API_URL%/health/ready
powershell -Command "try { Invoke-RestMethod '%API_URL%/health/ready' } catch { Write-Host 'ERROR:' $_.Exception.Message }"
pause
