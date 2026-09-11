-- 027_inbody_fecha_real_medicion.sql
-- Permite registrar mediciones InBody con fecha real de toma distinta a la fecha de digitación.
-- measured_at/created_at se usan para gráficas, retos y evolución corporal.
-- recorded_at conserva cuándo fue cargado el dato en la app para auditoría y prevención de trampas.
--
-- v1.21.0 hardening:
-- measured_at y recorded_at se crean con EXACTAMENTE el mismo tipo que created_at.
-- Esto evita conversiones implícitas timestamp <-> timestamptz y previene errores 42P17
-- en índices/expresiones posteriores.

do $$
declare
  v_created_at_type text;
begin
  if to_regclass('public.body_metrics') is null then
    raise exception 'No existe public.body_metrics. No se realizó ningún cambio.';
  end if;

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
    raise exception 'No existe public.body_metrics.created_at o no se pudo determinar su tipo.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'body_metrics'
      and column_name = 'measured_at'
  ) then
    execute format(
      'alter table public.body_metrics add column measured_at %s',
      v_created_at_type
    );
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'body_metrics'
      and column_name = 'recorded_at'
  ) then
    execute format(
      'alter table public.body_metrics add column recorded_at %s',
      v_created_at_type
    );
  end if;
end
$$;

update public.body_metrics
set measured_at = created_at
where measured_at is null
  and created_at is not null;

update public.body_metrics
set recorded_at = created_at
where recorded_at is null
  and created_at is not null;

create index if not exists idx_body_metrics_user_measured_at_desc
  on public.body_metrics (user_id, measured_at desc);

create index if not exists idx_body_metrics_user_recorded_at_desc
  on public.body_metrics (user_id, recorded_at desc);
