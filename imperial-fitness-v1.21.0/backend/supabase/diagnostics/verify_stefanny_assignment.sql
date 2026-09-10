-- Diagnóstico puntual para clientes cuyo nombre contiene Stefanny/Stefany.
-- No modifica datos.

select id, name, email, role, assigned_trainer_id
from public.users
where lower(name) like '%stefann%'
   or lower(name) like '%stefan%'
order by id;

select
  u.id as client_id,
  u.name as client_name,
  r.id as routine_id,
  r.title,
  r.active,
  r.created_at,
  r.trainer_id
from public.users u
left join public.assigned_routines r on r.client_id = u.id
where lower(u.name) like '%stefann%'
   or lower(u.name) like '%stefan%'
order by u.id, r.created_at desc, r.id desc;

select
  u.id as client_id,
  u.name as client_name,
  count(*) filter (where r.active = 1) as active_routines,
  max(r.created_at) filter (where r.active = 1) as latest_active_assignment
from public.users u
left join public.assigned_routines r on r.client_id = u.id
where lower(u.name) like '%stefann%'
   or lower(u.name) like '%stefan%'
group by u.id, u.name
order by u.id;

-- Verifica que la fila activa también tenga contenido utilizable por la app cliente.
-- Una rutina puede estar active = 1 y aun así verse vacía si payload_json no contiene days/exercises.
select
  u.id as client_id,
  u.name as client_name,
  r.id as routine_id,
  r.active,
  jsonb_array_length(coalesce((coalesce(nullif(r.payload_json, ''), '{}')::jsonb)->'days', '[]'::jsonb)) as training_days,
  (
    select coalesce(sum(jsonb_array_length(coalesce(day->'exercises', '[]'::jsonb))), 0)
    from jsonb_array_elements(coalesce((coalesce(nullif(r.payload_json, ''), '{}')::jsonb)->'days', '[]'::jsonb)) as days(day)
  ) as total_exercises,
  length(coalesce(r.payload_json, '')) as payload_characters
from public.users u
join public.assigned_routines r on r.client_id = u.id and r.active = 1
where lower(u.name) like '%stefann%'
   or lower(u.name) like '%stefan%'
order by r.created_at desc, r.id desc;
