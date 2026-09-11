-- ============================================================
-- IMPERIAL FITNESS - SUPABASE ROW LEVEL SECURITY
-- Ejecutar en Supabase SQL Editor cuando migres a PostgreSQL.
-- ============================================================

-- Necesario para mapear usuarios de Supabase Auth con usuarios de la app.
alter table if exists public.users
  add column if not exists auth_user_id uuid unique;

alter table if exists public.users
  add column if not exists status text not null default 'pending'
  check (status in ('pending', 'active', 'suspended', 'rejected'));

create index if not exists idx_users_auth_user_id on public.users(auth_user_id);

-- Helpers seguros para evitar repetir lógica en políticas.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'client');
$$;

create or replace function public.current_user_db_id()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin_or_trainer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('admin', 'trainer');
$$;

create or replace function public.is_assigned_trainer(client_user_id integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users client
    where client.id = client_user_id
      and client.assigned_trainer_id = public.current_user_db_id()
  );
$$;

-- Activar RLS.
alter table if exists public.users enable row level security;
alter table if exists public.foods enable row level security;
alter table if exists public.diet_plans enable row level security;
alter table if exists public.routine_templates enable row level security;
alter table if exists public.progress_photos enable row level security;
alter table if exists public.sync_events enable row level security;

-- Forzar RLS incluso para dueños de tabla cuando aplique.
alter table if exists public.users force row level security;
alter table if exists public.foods force row level security;
alter table if exists public.diet_plans force row level security;
alter table if exists public.routine_templates force row level security;
alter table if exists public.progress_photos force row level security;
alter table if exists public.sync_events force row level security;

-- Limpiar políticas previas si estás re-ejecutando.
drop policy if exists users_select_own_or_staff on public.users;
drop policy if exists users_update_own_or_admin on public.users;
drop policy if exists users_insert_admin_only on public.users;
drop policy if exists foods_select_authenticated on public.foods;
drop policy if exists foods_write_staff_only on public.foods;
drop policy if exists routines_select_authenticated on public.routine_templates;
drop policy if exists routines_write_staff_only on public.routine_templates;
drop policy if exists diet_select_owner_trainer_admin on public.diet_plans;
drop policy if exists diet_write_trainer_admin on public.diet_plans;
drop policy if exists photos_select_owner_trainer_admin on public.progress_photos;
drop policy if exists photos_insert_owner_trainer_admin on public.progress_photos;
drop policy if exists sync_select_related on public.sync_events;
drop policy if exists sync_insert_authenticated on public.sync_events;

-- USERS
create policy users_select_own_or_staff
on public.users
for select
to authenticated
using (
  (auth_user_id = auth.uid() and status = 'active')
  or public.is_admin_or_trainer()
);

create policy users_update_own_or_admin
on public.users
for update
to authenticated
using (
  auth_user_id = auth.uid()
  or public.current_app_role() = 'admin'
)
with check (
  auth_user_id = auth.uid()
  or public.current_app_role() = 'admin'
);

create policy users_insert_admin_only
on public.users
for insert
to authenticated
with check (public.current_app_role() = 'admin');

-- FOODS: clientes pueden leer alimentos necesarios para equivalencias; solo staff escribe.
create policy foods_select_authenticated
on public.foods
for select
to authenticated
using (true);

create policy foods_write_staff_only
on public.foods
for all
to authenticated
using (public.is_admin_or_trainer())
with check (public.is_admin_or_trainer());

-- ROUTINES
create policy routines_select_authenticated
on public.routine_templates
for select
to authenticated
using (true);

create policy routines_write_staff_only
on public.routine_templates
for all
to authenticated
using (public.is_admin_or_trainer())
with check (public.is_admin_or_trainer());

-- DIET PLANS
create policy diet_select_owner_trainer_admin
on public.diet_plans
for select
to authenticated
using (
  client_id = public.current_user_db_id()
  or public.current_app_role() = 'admin'
  or public.is_assigned_trainer(client_id)
);

create policy diet_write_trainer_admin
on public.diet_plans
for all
to authenticated
using (
  public.current_app_role() = 'admin'
  or public.is_assigned_trainer(client_id)
)
with check (
  public.current_app_role() = 'admin'
  or public.is_assigned_trainer(client_id)
);

-- PROGRESS PHOTOS
create policy photos_select_owner_trainer_admin
on public.progress_photos
for select
to authenticated
using (
  client_id = public.current_user_db_id()
  or public.current_app_role() = 'admin'
  or public.is_assigned_trainer(client_id)
);

create policy photos_insert_owner_trainer_admin
on public.progress_photos
for insert
to authenticated
with check (
  client_id = public.current_user_db_id()
  or public.current_app_role() = 'admin'
  or public.is_assigned_trainer(client_id)
);

-- SYNC EVENTS
create policy sync_select_related
on public.sync_events
for select
to authenticated
using (true);

create policy sync_insert_authenticated
on public.sync_events
for insert
to authenticated
with check (true);

-- IMPORTANTE:
-- Nunca uses SUPABASE_SERVICE_ROLE_KEY en React, Flutter, Expo ni navegador.
-- Esa llave solo vive en backend Python o funciones server-side.