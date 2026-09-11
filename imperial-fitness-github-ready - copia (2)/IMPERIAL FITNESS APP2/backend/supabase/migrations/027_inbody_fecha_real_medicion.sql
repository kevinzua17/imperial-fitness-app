-- 027_inbody_fecha_real_medicion.sql
-- Permite registrar mediciones InBody con fecha real de toma distinta a la fecha de digitación.
-- measured_at/created_at se usan para gráficas, retos y evolución corporal.
-- recorded_at conserva cuándo fue cargado el dato en la app para auditoría y prevención de trampas.

alter table if exists public.body_metrics
  add column if not exists measured_at timestamp without time zone;

alter table if exists public.body_metrics
  add column if not exists recorded_at timestamp without time zone;

update public.body_metrics
set measured_at = created_at
where measured_at is null;

update public.body_metrics
set recorded_at = created_at
where recorded_at is null;

create index if not exists idx_body_metrics_user_measured_at_desc
  on public.body_metrics (user_id, measured_at desc);

create index if not exists idx_body_metrics_user_recorded_at_desc
  on public.body_metrics (user_id, recorded_at desc);
