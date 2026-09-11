-- 028_mis_medidas_fecha_real_global.sql
-- Hace que Mis medidas use la fecha real de toma en toda la app, no la fecha de digitación.
-- Ejemplo: si la medición fue el 10 de junio y se registra el 20, en historial/gráficas queda el 10.
--
-- v1.21.0 hardening:
-- 1) Si measured_at/recorded_at aún no existen, se crean con el MISMO tipo de created_at.
-- 2) Se elimina el antiguo índice de expresión COALESCE que podía fallar con ERROR 42P17
--    cuando measured_at y created_at tenían tipos timestamp distintos.

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

-- Para mediciones antiguas: si no tienen fecha real, se conserva la fecha que ya tenían.
update public.body_metrics
set measured_at = created_at
where measured_at is null
  and created_at is not null;

-- Para trazabilidad interna: si no tienen fecha de digitación, se conserva la fecha original.
update public.body_metrics
set recorded_at = created_at
where recorded_at is null
  and created_at is not null;

-- Compatibilidad histórica: pantallas/reportes antiguos que todavía lean created_at
-- seguirán viendo la fecha real de toma.
update public.body_metrics
set created_at = measured_at
where measured_at is not null
  and created_at is distinct from measured_at;

create index if not exists idx_body_metrics_user_measured_at_desc
  on public.body_metrics (user_id, measured_at desc);

-- NO crear:
--   idx_body_metrics_user_effective_date_desc
--   (user_id, coalesce(measured_at, created_at) desc)
-- El índice simple por measured_at cubre el historial normal porque la migración
-- completa measured_at para los registros históricos.

drop index if exists public.idx_body_metrics_user_effective_date_desc;

create index if not exists idx_body_metrics_user_recorded_at_desc
  on public.body_metrics (user_id, recorded_at desc);
