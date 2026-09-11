-- Imperial Fitness v1.18.0
-- Verificación de migración 033. Solo lectura.

select
  case when count(*) = 11 then 'OK' else 'FALTAN COLUMNAS DE MIGRACIÓN 033' end as migration_033_columns,
  count(*) as columns_found
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
  case when count(*) = 2 then 'OK' else 'FALTAN TRIGGERS DE FECHAS' end as migration_033_triggers,
  count(*) as triggers_found
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in ('trg_sync_user_access_status_dates', 'trg_sync_membership_status_dates');

-- Debe devolver cero filas.
select id, name, email, status, pending_at, activated_at, suspended_at, status_changed_at
from public.users
where (status = 'pending' and pending_at is null)
   or (status = 'active' and activated_at is null)
   or (status = 'suspended' and suspended_at is null)
   or status_changed_at is null;

-- Debe devolver cero filas.
select user_id, trial_started_at, trial_ends_at, next_payment_due, manual_status, manual_status_until
from public.membership_accounts
where trial_ends_at < trial_started_at
   or next_payment_due is null
   or (manual_status is null and manual_status_until is not null);

-- Resumen de controles manuales actualmente activos.
select user_id, status, manual_status, manual_status_until, status_note, status_changed_at
from public.membership_accounts
where manual_status is not null
order by manual_status_until nulls last, user_id;
