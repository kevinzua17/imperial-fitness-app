-- Imperial Fitness - Seguimiento diario, teléfono y WhatsApp
-- Ejecutar una sola vez en Supabase SQL Editor antes de desplegar backend/frontend.

alter table public.users
  add column if not exists phone_number varchar(40),
  add column if not exists whatsapp_opt_in integer not null default 1;

create index if not exists idx_users_phone_number on public.users(phone_number);

create table if not exists public.daily_checkins (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  checkin_date varchar(10) not null,
  training_status varchar(30) not null default 'later',
  nutrition_status varchar(30) not null default 'later',
  planned_training_time varchar(40),
  mood varchar(40),
  notes text not null default '',
  source varchar(30) not null default 'client_app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_daily_checkins_user_date unique (user_id, checkin_date),
  constraint ck_daily_checkins_training_status check (training_status in ('trained','later','missed','rest')),
  constraint ck_daily_checkins_nutrition_status check (nutrition_status in ('completed','partial','missed','later'))
);

create index if not exists idx_daily_checkins_user_id on public.daily_checkins(user_id);
create index if not exists idx_daily_checkins_date on public.daily_checkins(checkin_date desc);
create index if not exists idx_daily_checkins_training_status on public.daily_checkins(training_status);
create index if not exists idx_daily_checkins_nutrition_status on public.daily_checkins(nutrition_status);
