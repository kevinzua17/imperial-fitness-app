-- Imperial Fitness v1.20.1
-- Hotfix aditivo para restaurar la lectura del historial de medidas.
-- No elimina registros, no modifica password_hash y no cambia usuarios.

begin;

select pg_advisory_xact_lock(
  hashtext('imperial_fitness_v1_20_1_migration_035')
);

do $$
begin
  if to_regclass('public.body_metrics') is null then
    raise exception 'No existe public.body_metrics. No se realizó ningún cambio.';
  end if;
end
$$;

alter table public.body_metrics
  add column if not exists measured_at timestamp without time zone,
  add column if not exists recorded_at timestamp without time zone,
  add column if not exists bmr_source varchar(30);

-- Los registros históricos conservan exactamente sus valores corporales.
-- Solo se completan fechas nulas para que el backend nuevo pueda leerlos.
update public.body_metrics
set measured_at = created_at
where measured_at is null;

update public.body_metrics
set recorded_at = created_at
where recorded_at is null;

update public.body_metrics
set bmr_source = 'recorded_bmr'
where bmr is not null
  and bmr_source is null;

create index if not exists idx_body_metrics_user_measured_at_desc
  on public.body_metrics (user_id, measured_at desc);

create index if not exists idx_body_metrics_user_effective_date_desc
  on public.body_metrics (user_id, coalesce(measured_at, created_at) desc);

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
