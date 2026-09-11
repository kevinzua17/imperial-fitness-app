# Corrección Supabase - sync_events

Se corrigió el script unificado `deploy/pilot/supabase/00_RUN_ALL_IN_SUPABASE.sql` porque las políticas RLS intentaban trabajar sobre `public.sync_events` antes de que esa tabla existiera.

## Archivos actualizados

- `deploy/pilot/supabase/00_RUN_ALL_IN_SUPABASE.sql`: ahora crea `public.sync_events` antes de activar RLS y crear políticas.
- `deploy/pilot/supabase/00A_FIX_SYNC_EVENTS.sql`: parche rápido para ejecutar en Supabase si el error ya apareció.

## Orden recomendado

1. Ejecutar `deploy/pilot/supabase/00A_FIX_SYNC_EVENTS.sql` si el SQL anterior falló.
2. Volver a ejecutar completo `deploy/pilot/supabase/00_RUN_ALL_IN_SUPABASE.sql`.

Los `CREATE TABLE IF NOT EXISTS` y `CREATE INDEX IF NOT EXISTS` permiten repetir el script sin duplicar tablas ni índices.
