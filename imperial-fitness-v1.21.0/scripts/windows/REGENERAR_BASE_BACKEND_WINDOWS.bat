@echo off
echo ================================================
echo  IMPERIAL FITNESS - REGENERAR BASE LOCAL
echo ================================================
cd backend
if not exist .venv (
  python -m venv .venv
)
call .venv\Scripts\activate
pip install -r requirements.txt
if exist imperial_fitness.db (
  del imperial_fitness.db
)
if not exist .env (
  copy .env.example .env
)
python -m app.seed
echo.
echo Base regenerada. Ahora puedes iniciar la API con:
echo uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
echo.
pause