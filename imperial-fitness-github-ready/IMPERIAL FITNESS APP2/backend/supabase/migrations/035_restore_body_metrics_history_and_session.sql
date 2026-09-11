-- Imperial Fitness v1.20.1 / compatible v1.21+
-- Hotfix aditivo para restaurar la lectura del historial de medidas.
-- No elimina registros, no modifica password_hash y no cambia usuarios.
-- Corregido: evita índices de expresión con casts dependientes de timezone (ERROR 42P17).

begin;

select pg_advisory_xact_lock(
  hashtext('imperial_fitness_v1_20_1_migration_035')
);

do $$
begin
  if to_regclass('public.body_metrics') is null then
    raise exception 'No existe public.body_metrics. No se realizó ningún cambio.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'body_metrics'
      and column_name = 'created_at'
  ) then
    raise exception 'No existe public.body_metrics.created_at. No se realizó ningún cambio.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'body_metrics'
      and column_name = 'user_id'
  ) then
    raise exception 'No existe public.body_metrics.user_id. No se realizó ningún cambio.';
  end if;
end
$$;

-- Crea las nuevas fechas con exactamente el mismo tipo de created_at cuando aún no existen.
do $$
declare
  v_created_at_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into v_created_at_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'body_metrics'
    and a.attname = 'created_at'
    and a.attnum > 0
    and not a.attisdropped;

  if v_created_at_type is null then
    raise exception 'No fue posible determinar el tipo de public.body_metrics.created_at.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'body_metrics' and column_name = 'measured_at'
  ) then
    execute format('alter table public.body_metrics add column measured_at %s', v_created_at_type);
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'body_metrics' and column_name = 'recorded_at'
  ) then
    execute format('alter table public.body_metrics add column recorded_at %s', v_created_at_type);
  end if;
end
$$;

alter table public.body_metrics
  add column if not exists bmr_source varchar(30);

-- Conserva valores corporales. Solo completa fechas históricas nulas.
update public.body_metrics
set measured_at = created_at
where measured_at is null
  and created_at is not null;

update public.body_metrics
set recorded_at = created_at
where recorded_at is null
  and created_at is not null;

update public.body_metrics
set bmr_source = 'recorded_bmr'
where bmr is not null
  and bmr_source is null;

create index if not exists idx_body_metrics_user_measured_at_desc
  on public.body_metrics (user_id, measured_at desc);

-- No se crea idx_body_metrics_user_effective_date_desc con COALESCE.
-- Cuando measured_at/created_at usan tipos timestamp distintos, PostgreSQL puede
-- introducir un cast no IMMUTABLE y rechazarlo con ERROR 42P17. Además, el
-- backfill anterior deja measured_at disponible para el historial existente.

create index if not exists idx_body_metrics_user_recorded_at_desc
  on public.body_metrics (user_id, recorded_at desc);

create index if not exists idx_body_metrics_user_bmr_source
  on public.body_metrics (user_id, bmr_source, measured_at desc);

commit;

-- Resumen final de solo lectura.
select
  count(*) as medidas_totales,
  count(*) filter (where measured_at is null) as medidas_sin_fecha_real,
  count(*) filter (where recorded_at is null) as medidas_sin_fecha_registro,
  count(*) filter (where bmr is not null and bmr_source is null) as tmb_sin_fuente
from public.body_metrics;
