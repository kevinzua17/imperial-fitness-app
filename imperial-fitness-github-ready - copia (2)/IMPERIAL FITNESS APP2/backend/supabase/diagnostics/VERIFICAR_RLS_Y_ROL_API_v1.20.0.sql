-- Imperial Fitness v1.20.0 — diagnóstico SOLO LECTURA de RLS y rol SQL.
-- No cambia permisos, políticas ni datos. Ejecutar desde Supabase SQL Editor y
-- conservar los resultados sin publicar nombres de roles o detalles de conexión.

-- 1) Contexto de la sesión. Un rol superusuario o BYPASSRLS puede omitir RLS;
-- por eso la API también debe mantener verificaciones explícitas por usuario/rol.
select
  current_database() as base_actual,
  current_user as rol_actual,
  r.rolsuper as es_superusuario,
  r.rolbypassrls as puede_omitir_rls,
  r.rolcanlogin as puede_iniciar_sesion
from pg_roles r
where r.rolname = current_user;

-- 2) RLS debe estar activo en las tablas que contienen cuentas, planes y progreso.
select
  c.relname as tabla,
  c.relrowsecurity as rls_habilitado,
  c.relforcerowsecurity as rls_forzado,
  count(p.policyname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relname in (
    'users','diet_plans','body_metrics','progress_photos','assigned_routines',
    'workout_set_logs','memberships','payments','chat_messages','sync_events'
  )
group by c.relname, c.relrowsecurity, c.relforcerowsecurity
order by c.relname;

-- 3) Resumen bloqueante para las cinco tablas verificadas por /health/ready.
select
  count(*) filter (where c.relrowsecurity) as tablas_sensibles_con_rls,
  count(*) filter (where not c.relrowsecurity) as tablas_sensibles_sin_rls,
  count(*) as tablas_sensibles_encontradas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('users','diet_plans','body_metrics','progress_photos','assigned_routines');

-- 4) Cobertura de auth_user_id. Solo conteos, sin correos ni identificadores.
select
  count(*) as usuarios_totales,
  count(*) filter (where auth_user_id is null) as usuarios_sin_auth_user_id,
  count(*) filter (where auth_user_id is not null) as usuarios_con_auth_user_id
from public.users;

-- 5) Políticas existentes. Muestra nombres y operaciones, no datos de clientes.
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('users','diet_plans','body_metrics','progress_photos','assigned_routines')
order by tablename, policyname;
