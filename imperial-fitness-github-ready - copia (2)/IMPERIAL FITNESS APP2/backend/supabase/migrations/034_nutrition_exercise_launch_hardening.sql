-- Imperial Fitness v1.20.0
-- Migración ADITIVA y NO DESTRUCTIVA para el lanzamiento de 500 usuarios.
-- No altera password_hash, refresh_tokens, correos, roles ni credenciales.
-- Ejecutar primero en una copia/staging y conservar un backup de Supabase.

begin;

alter table public.users
  add column if not exists activity_level varchar(30),
  add column if not exists workouts_per_week integer,
  add column if not exists average_daily_steps integer,
  add column if not exists occupation_activity varchar(30);

alter table public.body_metrics
  add column if not exists measured_at timestamp without time zone,
  add column if not exists recorded_at timestamp without time zone,
  add column if not exists bmr_source varchar(30);

update public.body_metrics
set measured_at = created_at
where measured_at is null;

update public.body_metrics
set recorded_at = created_at
where recorded_at is null;

-- Los registros existentes con TMB quedan honestamente marcados como fuente no confirmada.
update public.body_metrics
set bmr_source = 'recorded_bmr'
where bmr is not null and bmr_source is null;

-- La columna status necesita un backfill de una sola vez. El bloque comprueba
-- primero si ya existe para que una reejecución nunca archive borradores nuevos.
do $$
declare
  status_was_missing boolean;
begin
  select not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'diet_plans' and column_name = 'status'
  ) into status_was_missing;

  if status_was_missing then
    alter table public.diet_plans add column status varchar(30);
    update public.diet_plans
    set status = case when active = 1 then 'published' else 'archived' end;
  end if;
end $$;

-- Completa únicamente estados nulos si hubo una ejecución parcial previa.
update public.diet_plans
set status = case when active = 1 then 'published' else 'archived' end
where status is null;
alter table public.diet_plans alter column status set default 'draft';
alter table public.diet_plans alter column status set not null;

alter table public.diet_plans
  add column if not exists version integer not null default 1,
  add column if not exists calculation_json text not null default '{}',
  add column if not exists based_on_metric_id integer references public.body_metrics(id) on delete set null,
  add column if not exists approved_by integer references public.users(id) on delete set null,
  add column if not exists published_at timestamp without time zone,
  add column if not exists supersedes_plan_id integer references public.diet_plans(id) on delete set null;

update public.diet_plans
set published_at = coalesce(published_at, created_at)
where active = 1 and status = 'published';

alter table public.exercises
  add column if not exists is_visible integer not null default 1,
  add column if not exists is_routine_eligible integer not null default 1,
  add column if not exists review_status varchar(30) not null default 'approved',
  add column if not exists source varchar(80) not null default 'imperial';

create index if not exists idx_users_nutrition_activity
  on public.users(activity_level, workouts_per_week);
create index if not exists idx_body_metrics_user_bmr_source
  on public.body_metrics(user_id, bmr_source, measured_at desc);
create index if not exists idx_diet_plans_client_status_version
  on public.diet_plans(client_id, status, version desc);
create index if not exists idx_diet_plans_metric
  on public.diet_plans(based_on_metric_id);
create index if not exists idx_exercises_muscle_visibility
  on public.exercises(primary_muscle, is_visible, is_active, review_status);
create index if not exists idx_exercises_routine_eligible
  on public.exercises(is_routine_eligible, is_active, segment);

-- Constraints NOT VALID: protegen datos nuevos sin bloquear la migración por registros históricos.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_activity_level_v120_check') then
    alter table public.users add constraint users_activity_level_v120_check
      check (activity_level is null or activity_level in ('sedentary','light','moderate','very_active','athlete')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_workouts_per_week_v120_check') then
    alter table public.users add constraint users_workouts_per_week_v120_check
      check (workouts_per_week is null or workouts_per_week between 0 and 14) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_average_steps_v120_check') then
    alter table public.users add constraint users_average_steps_v120_check
      check (average_daily_steps is null or average_daily_steps between 0 and 100000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'body_metrics_bmr_source_v120_check') then
    alter table public.body_metrics add constraint body_metrics_bmr_source_v120_check
      check (bmr_source is null or bmr_source in ('inbody','mifflin_st_jeor','recorded_bmr','manual')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'diet_plans_status_v120_check') then
    alter table public.diet_plans add constraint diet_plans_status_v120_check
      check (status in ('draft','published','archived')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'exercises_review_status_v120_check') then
    alter table public.exercises add constraint exercises_review_status_v120_check
      check (review_status in ('pending','approved','rejected')) not valid;
  end if;
end $$;

commit;
