# Supabase - paso a paso

## Proyecto Supabase asignado

URL pública registrada para este piloto:

```env
SUPABASE_URL=https://vaaeaqdbocfnfasiznyl.supabase.co
```

Esta URL pública ya fue agregada en las plantillas de entorno del proyecto. Todavía falta copiar la `DATABASE_URL` real desde Supabase y pegarla únicamente en el backend cuando se despliegue en Render/Railway.


## 1. Crear proyecto

1. Entrar a Supabase.
2. Crear un proyecto nuevo.
3. Guardar la contraseña de la base de datos.
4. Esperar a que el proyecto termine de crearse.

## 2. Crear tablas y políticas

1. Ir a **SQL Editor**.
2. Crear una consulta nueva.
3. Copiar todo el contenido de:

```txt
deploy/pilot/supabase/00_RUN_ALL_IN_SUPABASE.sql
```

4. Ejecutar.
5. Revisar que no aparezcan errores.

## 3. Copiar DATABASE_URL

En Supabase:

1. Ir a **Project Settings**.
2. Entrar en **Database**.
3. Buscar **Connection string**.
4. Copiar la cadena de conexión.

Ejemplo:

```env
DATABASE_URL=postgresql://postgres.xxxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
```

## 4. Recomendación para piloto

Para backend en Render/Railway, usar preferentemente el **pooler** de Supabase, porque evita saturar conexiones si el servicio reinicia o escala.

## 5. Dato importante

El backend de esta app maneja usuarios y contraseñas desde FastAPI. Supabase se usa como PostgreSQL. No expongas la `service_role_key` en el frontend.
