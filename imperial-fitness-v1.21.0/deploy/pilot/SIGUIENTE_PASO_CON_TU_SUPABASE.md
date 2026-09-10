# Siguiente paso con tu Supabase - Imperial Fitness

Proyecto Supabase registrado:

```env
SUPABASE_URL=https://vaaeaqdbocfnfasiznyl.supabase.co
```

## Lo que ya quedó dentro del proyecto

- Se agregó tu URL pública de Supabase en `backend/.env.pilot.example`.
- Se agregó tu URL pública de Supabase en `deploy/pilot/render.env.example`.
- Se dejó documentada la URL para el piloto.

## Lo que falta hacer en Supabase

### 1. Crear las tablas

1. Abre tu proyecto de Supabase.
2. En el menú lateral entra a **SQL Editor**.
3. Crea una consulta nueva.
4. Copia todo el contenido de este archivo del proyecto:

```txt
deploy/pilot/supabase/00_RUN_ALL_IN_SUPABASE.sql
```

5. Pega el contenido completo en Supabase.
6. Presiona **Run**.
7. Si todo sale bien, ve a **Table Editor** y revisa que aparezcan las tablas de Imperial Fitness.

### 2. Obtener DATABASE_URL

Esta es la variable importante para conectar el backend FastAPI con Supabase PostgreSQL.

En Supabase:

1. Entra al proyecto.
2. Ve a **Connect** o **Project Settings > Database**.
3. Busca **Connection string**.
4. Usa preferentemente la opción **Transaction pooler** para piloto en Render/Railway.
5. Copia una URL parecida a esta:

```env
DATABASE_URL=postgresql://postgres.xxxxx:TU_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
```

6. Reemplaza `TU_PASSWORD` por la contraseña real de la base de datos.

### 3. Dónde pegar DATABASE_URL

No la pongas dentro del código ni la subas a GitHub.

Cuando se despliegue el backend en Render/Railway, se pega en el panel de variables privadas del backend:

```env
DATABASE_URL=postgresql://...
```

### 4. Qué NO debes compartir públicamente

No compartas en chats públicos ni repositorios:

- `DATABASE_URL` real.
- Contraseña de la base de datos.
- `SUPABASE_SERVICE_ROLE_KEY`.
- `SECRET_KEY` del backend.
- `SMTP_PASSWORD`.
- `CLOUDINARY_URL`.
- `REDIS_URL`.

### 5. Qué sí puedes compartir

- `SUPABASE_URL`, porque es pública.
- `SUPABASE_ANON_KEY`, solo si se necesita para frontend. Para esta versión, la app trabaja principalmente contra el backend FastAPI, así que no es obligatorio pegarla todavía.

## Estado actual

El proyecto ya está preparado para conectar tu Supabase. El siguiente bloqueo real es copiar la `DATABASE_URL` desde Supabase y tenerla lista para Render/Railway.
