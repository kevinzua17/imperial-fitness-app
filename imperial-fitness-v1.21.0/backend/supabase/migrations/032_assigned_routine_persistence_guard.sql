-- Imperial Fitness v1.15.0
-- Refuerzo de persistencia de asignaciones de rutina.
-- Es seguro ejecutar este archivo después de 031_active_plan_assignment_integrity.sql.

update public.assigned_routines
set active = 1
where active is null;

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

alter table public.assigned_routines
  alter column active set default 1;

alter table public.assigned_routines
  alter column active set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assigned_routines_active_binary'
      and conrelid = 'public.assigned_routines'::regclass
  ) then
    alter table public.assigned_routines
      add constraint assigned_routines_active_binary check (active in (0, 1));
  end if;
end $$;

create unique index if not exists uq_assigned_routines_one_active_per_client
  on public.assigned_routines(client_id)
  where active = 1;

create index if not exists idx_assigned_routines_client_active_latest
  on public.assigned_routines(client_id, active, created_at desc, id desc);
