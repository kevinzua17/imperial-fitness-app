-- Imperial Fitness v1.19.1
-- Recuperación segura del acceso administrativo.
-- Idempotente: completa la migración 033 si quedó parcial, elimina bloqueos por intentos
-- fallidos en cuentas admin y garantiza que exista al menos un administrador activo.
-- No borra usuarios, rutinas, dietas, pagos, membresías ni archivos.

begin;

-- 1) Completar columnas de acceso de usuarios.
alter table public.users add column if not exists pending_at timestamp without time zone;
alter table public.users add column if not exists activated_at timestamp without time zone;
alter table public.users add column if not exists suspended_at timestamp without time zone;
alter table public.users add column if not exists status_changed_at timestamp without time zone;
alter table public.users add column if not exists access_note varchar(500) not null default '';

update public.users
set
  status_changed_at = coalesce(status_changed_at, created_at, now()),
  pending_at = case when status = 'pending' then coalesce(pending_at, created_at, now()) else pending_at end,
  activated_at = case when status = 'active' then coalesce(activated_at, created_at, now()) else activated_at end,
  suspended_at = case when status = 'suspended' then coalesce(suspended_at, created_at, now()) else suspended_at end
where status_changed_at is null
   or (status = 'pending' and pending_at is null)
   or (status = 'active' and activated_at is null)
   or (status = 'suspended' and suspended_at is null);

create or replace function public.sync_user_access_status_dates()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.status_changed_at := coalesce(new.status_changed_at, new.created_at, now());
    if new.status = 'pending' then new.pending_at := coalesce(new.pending_at, new.created_at, now()); end if;
    if new.status = 'active' then new.activated_at := coalesce(new.activated_at, new.created_at, now()); end if;
    if new.status = 'suspended' then new.suspended_at := coalesce(new.suspended_at, new.created_at, now()); end if;
  elsif new.status is distinct from old.status then
    if new.status_changed_at is not distinct from old.status_changed_at then new.status_changed_at := now(); end if;
    if new.status = 'pending' and new.pending_at is not distinct from old.pending_at then new.pending_at := now(); end if;
    if new.status = 'active' and new.activated_at is not distinct from old.activated_at then new.activated_at := now(); end if;
    if new.status = 'suspended' and new.suspended_at is not distinct from old.suspended_at then new.suspended_at := now(); end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_user_access_status_dates on public.users;
create trigger trg_sync_user_access_status_dates
before insert or update of status on public.users
for each row execute function public.sync_user_access_status_dates();

-- 2) Completar columnas de membresía para evitar que el panel falle después del login.
alter table public.membership_accounts add column if not exists activated_at timestamp without time zone;
alter table public.membership_accounts add column if not exists pending_validation_at timestamp without time zone;
alter table public.membership_accounts add column if not exists status_changed_at timestamp without time zone;
alter table public.membership_accounts add column if not exists manual_status varchar(40);
alter table public.membership_accounts add column if not exists manual_status_until date;
alter table public.membership_accounts add column if not exists status_note varchar(500) not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_membership_manual_status'
      and conrelid = 'public.membership_accounts'::regclass
  ) then
    alter table public.membership_accounts
      add constraint chk_membership_manual_status
      check (manual_status is null or manual_status in (
        'trial_active','active','expiring_soon','pending_validation','overdue','limited','suspended'
      ));
  end if;
end $$;

update public.membership_accounts
set
  status_changed_at = coalesce(status_changed_at, updated_at, now()),
  activated_at = case when status in ('active', 'expiring_soon') then coalesce(activated_at, last_payment_at::timestamp, updated_at, now()) else activated_at end,
  pending_validation_at = case when status = 'pending_validation' then coalesce(pending_validation_at, updated_at, now()) else pending_validation_at end,
  suspended_at = case when status = 'suspended' then coalesce(suspended_at, updated_at, now()) else suspended_at end
where status_changed_at is null
   or (status in ('active', 'expiring_soon') and activated_at is null)
   or (status = 'pending_validation' and pending_validation_at is null)
   or (status = 'suspended' and suspended_at is null);

create or replace function public.sync_membership_status_dates()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.status_changed_at := coalesce(new.status_changed_at, new.updated_at, now());
  elsif new.status is distinct from old.status then
    if new.status_changed_at is not distinct from old.status_changed_at then new.status_changed_at := now(); end if;
    if new.status in ('active', 'expiring_soon') and new.activated_at is not distinct from old.activated_at then new.activated_at := now(); end if;
    if new.status = 'pending_validation' and new.pending_validation_at is not distinct from old.pending_validation_at then new.pending_validation_at := now(); end if;
    if new.status = 'suspended' and new.suspended_at is not distinct from old.suspended_at then new.suspended_at := now(); end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_membership_status_dates on public.membership_accounts;
create trigger trg_sync_membership_status_dates
before insert or update of status on public.membership_accounts
for each row execute function public.sync_membership_status_dates();

create index if not exists idx_users_status_changed_at on public.users(status, status_changed_at desc);
create index if not exists idx_membership_accounts_manual_status on public.membership_accounts(manual_status, manual_status_until);

-- 3) Eliminar bloqueos temporales en cuentas administrativas.
update public.users
set failed_login_attempts = 0,
    locked_until = null
where lower(role) = 'admin';

-- 4) Si por error no quedó ningún administrador activo, reactiva únicamente
-- la cuenta administrativa más antigua. No modifica clientes ni entrenadores.
do $$
declare
  rescue_admin_id bigint;
begin
  if not exists (
    select 1
    from public.users
    where lower(role) = 'admin' and status = 'active'
  ) then
    select id
      into rescue_admin_id
    from public.users
    where lower(role) = 'admin'
    order by created_at asc nulls last, id asc
    limit 1;

    if rescue_admin_id is not null then
      update public.users
      set status = 'active',
          activated_at = coalesce(activated_at, now()),
          status_changed_at = now(),
          access_note = case
            when coalesce(access_note, '') = '' then 'Acceso recuperado automáticamente por v1.19.1.'
            else left(access_note || ' | Acceso recuperado automáticamente por v1.19.1.', 500)
          end,
          failed_login_attempts = 0,
          locked_until = null
      where id = rescue_admin_id;
    end if;
  end if;
end $$;

commit;

-- Resultado esperado: al menos una fila con status = active y locked_until vacío.
select
  id,
  name,
  email,
  role,
  status,
  failed_login_attempts,
  locked_until,
  activated_at,
  status_changed_at
from public.users
where lower(role) = 'admin'
order by created_at asc nulls last, id asc;
