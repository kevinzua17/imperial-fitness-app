-- Imperial Fitness - Membresías, prueba gratuita y pagos por comprobante Nequi
-- Ejecutar una sola vez en Supabase > SQL Editor. Es seguro volver a ejecutarlo.

create table if not exists public.membership_accounts (
  user_id integer primary key references public.users(id) on delete cascade,
  trial_started_at date not null default current_date,
  trial_ends_at date not null default (current_date + interval '7 day')::date,
  billing_day integer not null default extract(day from current_date)::integer,
  monthly_price integer not null default 9900,
  currency varchar(10) not null default 'COP',
  last_payment_at date,
  next_payment_due date not null default (current_date + interval '7 day')::date,
  grace_until date,
  status varchar(40) not null default 'trial_active',
  limited_at timestamp without time zone,
  suspended_at timestamp without time zone,
  updated_at timestamp without time zone not null default now(),
  constraint chk_membership_status check (status in ('trial_active','active','expiring_soon','pending_validation','overdue','limited','suspended'))
);

create table if not exists public.membership_payments (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  amount integer not null default 9900,
  currency varchar(10) not null default 'COP',
  method varchar(40) not null default 'nequi',
  reference varchar(160),
  receipt_url varchar(700),
  status varchar(40) not null default 'pending',
  period_start date,
  period_end date,
  submitted_at timestamp without time zone not null default now(),
  reviewed_at timestamp without time zone,
  reviewed_by integer references public.users(id),
  admin_notes text not null default '',
  constraint chk_payment_status check (status in ('pending','approved','rejected'))
);

create index if not exists idx_membership_accounts_status_due on public.membership_accounts(status, next_payment_due);
create index if not exists idx_membership_payments_user_submitted on public.membership_payments(user_id, submitted_at desc);
create index if not exists idx_membership_payments_status on public.membership_payments(status, submitted_at desc);

-- Configuración inicial. Editar desde el panel admin o directamente aquí si se desea.
insert into public.app_settings (key, value)
values
  ('membership_monthly_price_cop', '9900'),
  ('membership_currency', 'COP'),
  ('membership_trial_days', '7'),
  ('membership_nequi_number', 'CONFIGURAR_NUMERO_NEQUI'),
  ('membership_payment_instructions', 'Realiza el pago por Nequi al número registrado, sube el comprobante y espera validación del equipo Imperial Fitness.')
on conflict (key) do nothing;

-- Crear membresía para clientes existentes.
insert into public.membership_accounts (
  user_id,
  trial_started_at,
  trial_ends_at,
  billing_day,
  monthly_price,
  currency,
  next_payment_due,
  status
)
select
  u.id,
  coalesce(u.created_at::date, current_date),
  (coalesce(u.created_at::date, current_date) + interval '7 day')::date,
  least(extract(day from coalesce(u.created_at::date, current_date))::integer, 28),
  coalesce((select value::integer from public.app_settings where key = 'membership_monthly_price_cop'), 9900),
  coalesce((select value from public.app_settings where key = 'membership_currency'), 'COP'),
  (coalesce(u.created_at::date, current_date) + interval '7 day')::date,
  case
    when current_date <= (coalesce(u.created_at::date, current_date) + interval '7 day')::date then 'trial_active'
    else 'overdue'
  end
from public.users u
where u.role = 'client'
on conflict (user_id) do nothing;
