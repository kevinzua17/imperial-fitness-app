-- Fase 6: permite retirar planes nutricionales sin borrar historial.
alter table public.diet_plans
  add column if not exists active integer not null default 1 check (active in (0, 1));

create index if not exists idx_diet_plans_active on public.diet_plans(active);
