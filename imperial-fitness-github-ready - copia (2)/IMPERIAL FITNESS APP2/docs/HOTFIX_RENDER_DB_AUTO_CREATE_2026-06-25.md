# Hotfix Render/Supabase - DB_AUTO_CREATE definitivo

## Problema

Render estaba intentando arrancar el backend y fallaba con:

```text
psycopg.errors.DuplicatePreparedStatement: prepared statement "_pg3_0" already exists
```

El error aparecía durante `Base.metadata.create_all(bind=engine)`, mientras SQLAlchemy intentaba inspeccionar tablas como `foods` en PostgreSQL/Supabase.

## Causa

El backend todavía podía ejecutar `init_db()` contra PostgreSQL si `APP_ENV` no estaba exactamente en `production` o si el entorno viejo de Render no había tomado la configuración esperada.

## Corrección aplicada

- `DB_AUTO_CREATE=false` por defecto.
- PostgreSQL/Supabase no ejecuta `metadata.create_all()` al arrancar, aunque `APP_ENV` esté mal configurado.
- SQLite local sí puede auto-crear estructura para desarrollo.
- `DB_DISABLE_PREPARED_STATEMENTS=true` por defecto.
- En conexiones PostgreSQL con psycopg3 se aplica `prepare_threshold=None` para evitar prepared statements en poolers de Supabase/Render.

## Variables recomendadas en Render

```env
DB_AUTO_CREATE=false
DB_DISABLE_PREPARED_STATEMENTS=true
APP_ENV=production
```

## Supabase

No se ejecuta SQL. No se crean tablas. No se modifican políticas RLS. No se toca la base de datos.
