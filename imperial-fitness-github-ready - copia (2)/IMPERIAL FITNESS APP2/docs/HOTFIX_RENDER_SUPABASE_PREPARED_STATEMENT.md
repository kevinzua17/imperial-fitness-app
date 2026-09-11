# Hotfix Render + Supabase: DuplicatePreparedStatement

## Error corregido

Render podía iniciar correctamente y luego fallar en el arranque con:

```txt
psycopg.errors.DuplicatePreparedStatement: prepared statement "_pg3_0" already exists
```

El fallo aparecía durante `Base.metadata.create_all(bind=engine)`, cuando SQLAlchemy intentaba inspeccionar tablas contra PostgreSQL/Supabase.

## Corrección aplicada

1. Se desactivaron prepared statements de psycopg3 para PostgreSQL mediante `prepare_threshold=None`.
2. Se agregó `DB_DISABLE_PREPARED_STATEMENTS=true` por defecto.
3. Se agregó `DB_AUTO_CREATE=false` por defecto.
4. En PostgreSQL/Supabase el backend ya no ejecuta `create_all()` automáticamente salvo autorización explícita.
5. En local con SQLite se conserva la creación automática de tablas.
6. Se agregó endpoint raíz `/` para evitar 404 en comprobaciones simples del servicio.

## Importante

Este hotfix NO ejecuta SQL en Supabase, NO altera tablas y NO modifica políticas RLS.

## Variables recomendadas en Render

```env
APP_ENV=production
DB_AUTO_CREATE=false
DB_DISABLE_PREPARED_STATEMENTS=true
```
