-- Imperial Fitness v1.19.1 — solo lectura.

select
  case when count(*) = 11 then 'OK' else 'FALTAN COLUMNAS DE ACCESO/MEMBRESÍA' end as schema_access_ready
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'users' and column_name in (
      'pending_at', 'activated_at', 'suspended_at', 'status_changed_at', 'access_note'
    ))
    or
    (table_name = 'membership_accounts' and column_name in (
      'activated_at', 'pending_validation_at', 'status_changed_at',
      'manual_status', 'manual_status_until', 'status_note'
    ))
  );

select
  case when count(distinct trigger_name) = 2 then 'OK' else 'FALTAN TRIGGERS DE FECHAS' end as access_triggers_ready
from information_schema.triggers
where event_object_schema = 'public'
  and trigger_name in ('trg_sync_user_access_status_dates', 'trg_sync_membership_status_dates');

select
  case when exists (
    select 1 from public.users
    where lower(role) = 'admin'
      and status = 'active'
      and (locked_until is null or locked_until <= now())
  ) then 'OK' else 'NO HAY ADMIN ACTIVO Y DESBLOQUEADO' end as admin_access_ready;

select id, name, email, role, status, failed_login_attempts, locked_until,
       pending_at, activated_at, suspended_at, status_changed_at
from public.users
where lower(role) = 'admin'
order by created_at asc nulls last, id asc;
