# Imperial Fitness - Supabase SQL Flow

Este proyecto queda cerrado con flujo SQL para Supabase, no Alembic por ahora.

## Orden obligatorio

1. Crear proyecto en Supabase.
2. Abrir SQL Editor.
3. Ejecutar:

```text
backend/supabase/schema.sql
```

4. Ejecutar:

```text
backend/supabase/migrations/001_enable_rls.sql
```

5. Ejecutar:

```text
backend/supabase/migrations/002_rls_extended_modules.sql
```

6. Configurar en Render:

```env
DATABASE_URL=postgresql://...
```

7. Ejecutar seed desde backend apuntando a Supabase:

```powershell
python -m app.seed
```

## Nota

No usar `Base.metadata.create_all()` como migración de producción. En producción la fuente de verdad es `schema.sql` + RLS.