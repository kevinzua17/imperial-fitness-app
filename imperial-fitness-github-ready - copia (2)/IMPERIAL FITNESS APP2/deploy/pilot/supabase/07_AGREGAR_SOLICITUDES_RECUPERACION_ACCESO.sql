-- Imperial Fitness - Solicitudes internas de recuperación de acceso
-- Ejecutar en Supabase SQL Editor antes de desplegar backend/frontend.

create table if not exists public.password_reset_requests (
  id bigserial primary key,
  user_id integer null references public.users(id) on delete set null,
  email varchar(160) not null,
  user_name varchar(160) null,
  phone_number varchar(40) null,
  status varchar(30) not null default 'pending',
  requested_at timestamp without time zone not null default now(),
  resolved_at timestamp without time zone null,
  resolved_by integer null references public.users(id) on delete set null,
  admin_notes text not null default '',
  temporary_password_issued integer not null default 0,
  metadata_json text not null default '{}'
);

create index if not exists ix_password_reset_requests_status
  on public.password_reset_requests(status);

create index if not exists ix_password_reset_requests_requested_at
  on public.password_reset_requests(requested_at desc);

create index if not exists ix_password_reset_requests_email
  on public.password_reset_requests(lower(email));

-- Evita duplicar muchas solicitudes pendientes del mismo correo.
-- Se mantiene una sola solicitud pendiente por correo; nuevas solicitudes actualizan fecha/datos.
create unique index if not exists uq_password_reset_requests_pending_email
  on public.password_reset_requests(lower(email))
  where status = 'pending';

-- Opcional: bandera para obligar cambio posterior de contraseña temporal.
alter table public.users
  add column if not exists force_password_change integer not null default 0;
