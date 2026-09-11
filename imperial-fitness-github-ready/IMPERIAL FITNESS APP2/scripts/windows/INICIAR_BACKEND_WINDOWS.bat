@echo off
echo ================================================
echo  IMPERIAL FITNESS - INICIAR BACKEND PYTHON
echo ================================================
cd backend
if not exist .venv (
  python -m venv .venv
)
call .venv\Scripts\activate
pip install -r requirements.txt
if not exist .env (
  copy .env.example .env
)
python -m app.seed
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause