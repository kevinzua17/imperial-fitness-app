-- Verifica asignaciones activas por cliente.
select
  u.id as client_id,
  u.name as client_name,
  count(distinct d.id) filter (where d.active = 1) as active_diets,
  max(d.id) filter (where d.active = 1) as active_diet_id,
  count(distinct r.id) filter (where r.active = 1) as active_routines,
  max(r.id) filter (where r.active = 1) as active_routine_id
from public.users u
left join public.diet_plans d on d.client_id = u.id
left join public.assigned_routines r on r.client_id = u.id
where u.role = 'client'
group by u.id, u.name
order by u.name;

-- Estas consultas deben devolver cero filas después de ejecutar la migración 031.
select client_id, count(*) as active_diets
from public.diet_plans
where active = 1
group by client_id
having count(*) > 1;

select client_id, count(*) as active_routines
from public.assigned_routines
where active = 1
group by client_id
having count(*) > 1;
