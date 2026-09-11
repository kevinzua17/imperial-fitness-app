-- 017_user_phone_whatsapp.sql
-- Agrega datos de contacto necesarios para comunicación directa con clientes por WhatsApp.

alter table if exists public.users
  add column if not exists phone_number varchar(40),
  add column if not exists whatsapp_opt_in integer not null default 1;

alter table if exists public.users
  drop constraint if exists users_whatsapp_opt_in_check;

alter table if exists public.users
  add constraint users_whatsapp_opt_in_check check (whatsapp_opt_in in (0, 1));

create index if not exists idx_users_phone_number on public.users(phone_number);
