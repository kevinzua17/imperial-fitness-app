-- Imperial Fitness - Control de acceso por membresía
-- Ejecutar en Supabase > SQL Editor después del módulo de membresías.
-- Es seguro volver a ejecutarlo.

insert into public.app_settings (key, value)
values
  ('membership_grace_days', '3'),
  ('membership_suspension_days', '7'),
  ('membership_restrict_pending_validation', 'true')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Refresca estados existentes según fechas individuales y comprobantes pendientes.
with pending as (
  select user_id, count(*) as total
  from public.membership_payments
  where status = 'pending'
  group by user_id
)
update public.membership_accounts ma
set status = case
    when coalesce(p.total, 0) > 0 then 'pending_validation'
    when ma.last_payment_at is null and current_date <= ma.trial_ends_at then 'trial_active'
    when ma.next_payment_due >= current_date + interval '4 day' then 'active'
    when ma.next_payment_due between current_date and current_date + interval '3 day' then 'expiring_soon'
    when current_date - ma.next_payment_due between 1 and 3 then 'overdue'
    when current_date - ma.next_payment_due between 4 and 7 then 'limited'
    else 'suspended'
  end,
  limited_at = case
    when current_date - ma.next_payment_due between 4 and 7 and ma.limited_at is null then now()
    else ma.limited_at
  end,
  suspended_at = case
    when current_date - ma.next_payment_due > 7 and ma.suspended_at is null then now()
    else ma.suspended_at
  end,
  updated_at = now()
from pending p
where p.user_id = ma.user_id;

-- Refresca también cuentas sin comprobantes pendientes.
update public.membership_accounts ma
set status = case
    when ma.last_payment_at is null and current_date <= ma.trial_ends_at then 'trial_active'
    when ma.next_payment_due >= current_date + interval '4 day' then 'active'
    when ma.next_payment_due between current_date and current_date + interval '3 day' then 'expiring_soon'
    when current_date - ma.next_payment_due between 1 and 3 then 'overdue'
    when current_date - ma.next_payment_due between 4 and 7 then 'limited'
    else 'suspended'
  end,
  limited_at = case
    when current_date - ma.next_payment_due between 4 and 7 and ma.limited_at is null then now()
    else ma.limited_at
  end,
  suspended_at = case
    when current_date - ma.next_payment_due > 7 and ma.suspended_at is null then now()
    else ma.suspended_at
  end,
  updated_at = now()
where not exists (
  select 1
  from public.membership_payments mp
  where mp.user_id = ma.user_id and mp.status = 'pending'
);
