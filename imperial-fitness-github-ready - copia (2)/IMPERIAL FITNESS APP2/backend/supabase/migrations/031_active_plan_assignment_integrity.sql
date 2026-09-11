-- Imperial Fitness v1.14.0
-- Conserva una sola dieta y una sola rutina activas por cliente.
-- Antes de crear los índices, desactiva duplicados históricos y mantiene
-- el registro más reciente por id como asignación vigente.

with ranked_diets as (
  select id,
         row_number() over (partition by client_id order by created_at desc, id desc) as position
  from public.diet_plans
  where active = 1
)
update public.diet_plans d
set active = 0
from ranked_diets r
where d.id = r.id
  and r.position > 1;

with ranked_routines as (
  select id,
         row_number() over (partition by client_id order by created_at desc, id desc) as position
  from public.assigned_routines
  where active = 1
)
update public.assigned_routines r
set active = 0
from ranked_routines ranked
where r.id = ranked.id
  and ranked.position > 1;

create unique index if not exists uq_diet_plans_one_active_per_client
  on public.diet_plans(client_id)
  where active = 1;

create unique index if not exists uq_assigned_routines_one_active_per_client
  on public.assigned_routines(client_id)
  where active = 1;
