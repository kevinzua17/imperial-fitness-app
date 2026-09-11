# Imperial Fitness - Guia rapida local

## Backend

Abre PowerShell:

```powershell
cd "C:\Users\kebin\Downloads\imperial-fitness-ai-ecosystem\backend"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python -m app.seed
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Prueba:

```text
http://localhost:8000/docs
```

## Frontend

Abre otra ventana de PowerShell:

```powershell
cd "C:\Users\kebin\Downloads\imperial-fitness-ai-ecosystem"
npm install
npm run dev
```

Prueba:

```text
http://localhost:5173
```

## Usuarios demo estables

```text
admin@imperialfitness.co / imperial123
francy@imperialfitness.co / imperial123
julian@client.com / imperial123
```

## Cuando usar cada comando

- `pip install -r requirements.txt`: solo cuando cambian dependencias del backend o se crea `.venv`.
- `python -m app.seed`: para crear/actualizar usuarios demo y datos minimos sin duplicar.
- `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`: para correr backend.
- `npm install`: solo cuando cambian dependencias frontend.
- `npm run dev`: para correr web.

## Reglas importantes

- No borres `backend/.venv` salvo que quieras reinstalar Python desde cero.
- No subas `.env` a internet.
- Si cambias `.env`, reinicia backend.
- Si falla login, revisa primero `http://localhost:8000/health`.