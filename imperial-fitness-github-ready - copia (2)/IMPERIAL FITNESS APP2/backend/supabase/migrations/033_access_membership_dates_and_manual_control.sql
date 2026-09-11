-- Imperial Fitness v1.18.0
-- Fechas auditables de acceso y control manual seguro de membresías.
-- Idempotente: se puede volver a ejecutar sin borrar información.

begin;

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
      check (manual_status is null or manual_status in ('trial_active','active','expiring_soon','pending_validation','overdue','limited','suspended'));
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

commit;
