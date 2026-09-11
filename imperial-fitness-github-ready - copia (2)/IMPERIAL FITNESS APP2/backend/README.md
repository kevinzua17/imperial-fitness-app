# Imperial Fitness Backend API

API Python para sincronizar la web administrativa, la app del cliente y la app del entrenador.

## 1. Requisitos locales

- Python 3.11 o superior
- Git
- Un editor como VS Code

## 2. Crear entorno virtual

Desde la carpeta `backend`:

```bash
python -m venv .venv
```

Activar en Windows:

```bash
.venv\Scripts\activate
```

Activar en macOS/Linux:

```bash
source .venv/bin/activate
```

## 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

## 4. Crear variables de entorno

Copia `.env.example` como `.env` y ajusta los valores.

## 5. Iniciar la API local

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 6. Ver documentación automática

Abre:

```text
http://localhost:8000/docs
```

## 7. Rutas principales

- `GET /health` verifica que el servidor esté activo.
- `POST /auth/login` inicio de sesión simulado.
- `GET /users` lista usuarios.
- `POST /users` crea usuario.
- `GET /nutrition/foods` lista alimentos.
- `POST /nutrition/equivalence` calcula equivalencias.
- `GET /routines/templates` lista rutinas.
- `POST /progress/photos` registra foto de progreso.
- `GET /sync/events` eventos sincronizados.

## 8. Estado de conexion frontend

La web React ya consume esta API para login, usuarios, dietas, rutinas, progreso, comunidad, recompensas, finanzas, branding y retencion.

Para beta privada, el siguiente paso operativo es correr la API contra Supabase PostgreSQL y usar Cloudinary como storage de imagenes.

## 9. Seguridad configurada

### CORS estricto

Edita `.env` y deja solo los dominios reales de tu app:

```env
CORS_ORIGINS=https://app.imperialfitness.com.co
```

En desarrollo puedes mantener:

```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Variables sensibles

Nunca subas `.env` a GitHub. Usa `.env.example` como guía y guarda secretos reales solo en:

```text
.env
```

Variables importantes:

```env
SECRET_KEY=usa-una-clave-larga-y-aleatoria
DATABASE_URL=postgresql://...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=solo-en-backend
```

### Rate limiting

La API limita peticiones por usuario/IP por minuto:

```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=90
```

Para producción con varios servidores, cambiaremos el rate limit en memoria por Redis.

### Sanitización de inputs

Los modelos Pydantic limpian strings peligrosos, eliminan scripts/event handlers y limitan tamaños de campos.

### Supabase RLS

La migración está en:

```text
backend/supabase/migrations/001_enable_rls.sql
```

Ejecuta ese SQL en Supabase cuando migres a PostgreSQL. Activa políticas para usuarios, alimentos, dietas, rutinas, fotos y eventos de sincronización.

## 10. Plataforma privada y aprobación de usuarios

El flujo de acceso queda así:

1. El visitante solicita acceso desde el registro público.
2. El backend crea la cuenta como `role=client` y `status=pending`.
3. El usuario no puede iniciar sesión hasta ser aprobado.
4. El administrador entra al panel interno y cambia el estado a `active`.
5. Solo usuarios con `status=active` pueden iniciar sesión.

Estados disponibles:

```text
pending
active
suspended
rejected
```

Mensaje si no está aprobado:

```text
Cuenta pendiente de aprobación
```

Solo el administrador puede crear cuentas de `trainer` o `admin` usando `POST /users` con token de administrador.

## 11. Pruebas de permisos

Instala dependencias y corre:

```bash
pytest
```

Incluye pruebas básicas para:

- admin accede a usuarios
- cliente no accede a listado global
- cliente puede consultar sus endpoints propios
- entrenador no puede crear administradores

Endpoints principales de administración:

```text
GET /users?status=pending
GET /users/admin/pending
PATCH /users/{user_id}/status
POST /users/{user_id}/approve
POST /users/{user_id}/reject
POST /users/{user_id}/suspend
POST /users/{user_id}/reactivate
```