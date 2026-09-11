-- Imperial Fitness v1.17.0
-- Diagnóstico integral de entrega de rutina para Stefanny.
-- Solo lectura: no modifica datos.
-- Ejecutar en Supabase SQL Editor con una cuenta administradora.

with candidate_users as (
  select
    u.id,
    u.name,
    u.email,
    u.role,
    u.status as user_status,
    u.assigned_trainer_id,
    u.last_login_at,
    u.created_at,
    count(*) over (partition by lower(trim(u.email))) as accounts_same_email
  from public.users u
  where lower(coalesce(u.name, '')) like '%stefanny%'
     or lower(coalesce(u.email, '')) like '%stefanny%'
),
active_routines as (
  select
    r.*,
    row_number() over (
      partition by r.client_id
      order by r.created_at desc, r.id desc
    ) as latest_position,
    count(*) over (partition by r.client_id) as active_count
  from public.assigned_routines r
  join candidate_users u on u.id = r.client_id
  where r.active = 1
),
routine_health as (
  select
    r.client_id,
    r.id as routine_id,
    r.title as routine_title,
    r.trainer_id,
    r.created_at as routine_created_at,
    r.active_count,
    length(coalesce(r.payload_json, '')) as payload_chars,
    pg_input_is_valid(coalesce(r.payload_json, ''), 'jsonb') as payload_valid,
    case
      when pg_input_is_valid(coalesce(r.payload_json, ''), 'jsonb')
        then jsonb_array_length(
          case
            when jsonb_typeof((r.payload_json::jsonb)->'days') = 'array'
              then (r.payload_json::jsonb)->'days'
            else '[]'::jsonb
          end
        )
      else 0
    end as training_days,
    case
      when pg_input_is_valid(coalesce(r.payload_json, ''), 'jsonb') then (
        select coalesce(sum(
          case
            when jsonb_typeof(day_item->'exercises') = 'array'
              then jsonb_array_length(day_item->'exercises')
            else 0
          end
        ), 0)::int
        from jsonb_array_elements(
          case
            when jsonb_typeof((r.payload_json::jsonb)->'days') = 'array'
              then (r.payload_json::jsonb)->'days'
            else '[]'::jsonb
          end
        ) as day_item
      )
      else 0
    end as total_exercises
  from active_routines r
  where r.latest_position = 1
),
pending_payment_counts as (
  select p.user_id, count(*)::int as pending_payments
  from public.membership_payments p
  where p.status = 'pending'
  group by p.user_id
),
settings as (
  select
    coalesce(max(value) filter (where key = 'membership_grace_days'), '3')::int as grace_days,
    coalesce(max(value) filter (where key = 'membership_suspension_days'), '7')::int as suspension_days
  from public.app_settings
),
membership_health as (
  select
    u.id as user_id,
    ma.status as stored_membership_status,
    ma.trial_ends_at,
    ma.last_payment_at,
    ma.next_payment_due,
    ma.grace_until,
    coalesce(pp.pending_payments, 0) as pending_payments,
    case
      when ma.user_id is null then 'not_configured'
      when coalesce(pp.pending_payments, 0) > 0 then 'pending_validation'
      when ma.last_payment_at is null
           and ma.trial_ends_at is not null
           and current_date <= ma.trial_ends_at then 'trial_active'
      when ma.next_payment_due is null then 'overdue'
      when (ma.next_payment_due - current_date) >= 4 then 'active'
      when (ma.next_payment_due - current_date) between 0 and 3 then 'expiring_soon'
      when (current_date - ma.next_payment_due) between 1 and s.grace_days then 'overdue'
      when (current_date - ma.next_payment_due) between (s.grace_days + 1) and s.suspension_days then 'limited'
      else 'suspended'
    end as effective_membership_status
  from candidate_users u
  left join public.membership_accounts ma on ma.user_id = u.id
  left join pending_payment_counts pp on pp.user_id = u.id
  cross join settings s
)
select
  u.id as user_id,
  u.name,
  u.email,
  u.role,
  u.user_status,
  u.accounts_same_email,
  u.assigned_trainer_id,
  u.last_login_at,
  rh.routine_id,
  rh.routine_title,
  coalesce(rh.active_count, 0) as active_routine_count,
  coalesce(rh.payload_chars, 0) as payload_chars,
  coalesce(rh.payload_valid, false) as payload_valid,
  coalesce(rh.training_days, 0) as training_days,
  coalesce(rh.total_exercises, 0) as total_exercises,
  mh.stored_membership_status,
  mh.effective_membership_status,
  mh.pending_payments,
  mh.next_payment_due,
  case
    when u.role <> 'client' then 'BLOQUEO: la cuenta no tiene rol client'
    when u.user_status <> 'active' then 'BLOQUEO: la cuenta de usuario no está activa'
    when u.accounts_same_email > 1 then 'BLOQUEO: existen cuentas duplicadas por correo ignorando mayúsculas'
    when coalesce(rh.active_count, 0) = 0 then 'BLOQUEO: no existe rutina activa'
    when coalesce(rh.active_count, 0) > 1 then 'BLOQUEO: existen varias rutinas activas'
    when not coalesce(rh.payload_valid, false) then 'BLOQUEO: payload_json inválido'
    when coalesce(rh.training_days, 0) = 0 then 'BLOQUEO: rutina sin días'
    when coalesce(rh.total_exercises, 0) = 0 then 'BLOQUEO: rutina sin ejercicios'
    when mh.effective_membership_status in ('pending_validation', 'limited', 'suspended')
      then 'BLOQUEO: membresía impide abrir rutinas'
    else 'LISTA PARA ENTREGA: validar que Stefanny inicia sesión con este correo e ID'
  end as diagnosis
from candidate_users u
left join routine_health rh on rh.client_id = u.id
left join membership_health mh on mh.user_id = u.id
order by u.last_login_at desc nulls last, u.id;

-- Comprobación de la protección crítica de una única rutina activa por cliente.
select
  case when exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'assigned_routines'
      and indexname = 'uq_assigned_routines_one_active_per_client'
  ) then 'OK' else 'FALTA MIGRACIÓN 031/032' end as routine_single_active_guard;
