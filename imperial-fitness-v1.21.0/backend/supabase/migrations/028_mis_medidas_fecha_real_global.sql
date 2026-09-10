-- 028_mis_medidas_fecha_real_global.sql
-- Hace que Mis medidas use la fecha real de toma en toda la app, no la fecha de digitación.
-- Ejemplo: si la medición fue el 10 de junio y se registra el 20, en historial/gráficas queda el 10.

alter table if exists public.body_metrics
  add column if not exists measured_at timestamp without time zone;

alter table if exists public.body_metrics
  add column if not exists recorded_at timestamp without time zone;

-- Para mediciones antiguas: si no tienen fecha real, se conserva la fecha que ya tenían.
update public.body_metrics
set measured_at = created_at
where measured_at is null;

-- Para trazabilidad interna: si no tienen fecha de digitación, se conserva la fecha original.
update public.body_metrics
set recorded_at = created_at
where recorded_at is null;

-- Compatibilidad global: pantallas o reportes que todavía lean created_at verán la fecha real de toma.
update public.body_metrics
set created_at = measured_at
where measured_at is not null
  and created_at is distinct from measured_at;

create index if not exists idx_body_metrics_user_measured_at_desc
  on public.body_metrics (user_id, measured_at desc);

create index if not exists idx_body_metrics_user_effective_date_desc
  on public.body_metrics (user_id, coalesce(measured_at, created_at) desc);

create index if not exists idx_body_metrics_user_recorded_at_desc
  on public.body_metrics (user_id, recorded_at desc);
