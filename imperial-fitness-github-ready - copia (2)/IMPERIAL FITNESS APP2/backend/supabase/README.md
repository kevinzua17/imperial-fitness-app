# Supabase RLS

Este directorio contiene la migración SQL para activar Row Level Security (RLS) cuando migres la base de datos a Supabase/PostgreSQL.

## Cómo aplicarlo

1. Entra a Supabase.
2. Abre SQL Editor.
3. Copia el contenido de `migrations/001_enable_rls.sql`.
4. Ejecuta el script.

## Requisito importante

Para que las políticas funcionen con Supabase Auth, cada usuario de la tabla `public.users` debe tener:

```sql
auth_user_id = auth.uid()
```

Y en `app_metadata` del usuario de Supabase debe existir:

```json
{
  "role": "admin"
}
```

o

```json
{
  "role": "trainer"
}
```

o

```json
{
  "role": "client"
}
```

Si inicialmente todo entra por el backend Python, el backend debe usar la service role key solo en servidor, nunca en frontend.