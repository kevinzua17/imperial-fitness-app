-- ============================================================
-- IMPERIAL FITNESS
-- MIGRACION 004 - Seguimiento, asistencia y alertas de retencion
-- Ejecutar en Supabase SQL Editor.
-- Es segura para ejecutar mas de una vez.
-- ============================================================

-- 1) Tabla de asistencias / check-ins
create table if not exists public.attendance_logs (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  checked_at timestamptz not null default now(),
  source varchar(60) not null default 'manual'
);

alter table public.attendance_logs
  add column if not exists checked_at timestamptz not null default now();

alter table public.attendance_logs
  add column if not exists source varchar(60) not null default 'manual';

create index if not exists idx_attendance_logs_user_id
  on public.attendance_logs(user_id);

create index if not exists idx_attendance_logs_checked_at
  on public.attendance_logs(checked_at desc);

create index if not exists idx_attendance_logs_user_checked_at
  on public.attendance_logs(user_id, checked_at desc);

-- 2) Tabla de alertas de retencion
create table if not exists public.retention_alerts (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  risk varchar(30) not null default 'medium',
  reason text not null,
  suggested_action text not null default '',
  status varchar(30) not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.retention_alerts
  add column if not exists risk varchar(30) not null default 'medium';

alter table public.retention_alerts
  add column if not exists reason text not null default 'Seguimiento requerido.';

alter table public.retention_alerts
  add column if not exists suggested_action text not null default '';

alter table public.retention_alerts
  add column if not exists status varchar(30) not null default 'open';

alter table public.retention_alerts
  add column if not exists created_at timestamptz not null default now();

-- 3) Constraints seguros: se crean solo si no existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_retention_alerts_risk'
  ) THEN
    ALTER TABLE public.retention_alerts
      ADD CONSTRAINT chk_retention_alerts_risk
      CHECK (risk in ('low', 'medium', 'high'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_retention_alerts_status'
  ) THEN
    ALTER TABLE public.retention_alerts
      ADD CONSTRAINT chk_retention_alerts_status
      CHECK (status in ('open', 'resolved', 'dismissed'));
  END IF;
END $$;

create index if not exists idx_retention_alerts_user_id
  on public.retention_alerts(user_id);

create index if not exists idx_retention_alerts_status
  on public.retention_alerts(status);

create index if not exists idx_retention_alerts_risk
  on public.retention_alerts(risk);

create index if not exists idx_retention_alerts_created_at
  on public.retention_alerts(created_at desc);

create index if not exists idx_retention_alerts_open_user_reason
  on public.retention_alerts(user_id, status, reason);

-- 4) RLS opcional. Si tus funciones de seguridad ya existen, activa politicas.
-- Si el backend se conecta con DATABASE_URL directo desde Render, el backend tambien valida permisos.
DO $$
DECLARE
  has_security_functions boolean;
BEGIN
  SELECT
    to_regprocedure('public.current_user_db_id()') IS NOT NULL
    AND to_regprocedure('public.current_app_role()') IS NOT NULL
    AND to_regprocedure('public.is_assigned_trainer(integer)') IS NOT NULL
  INTO has_security_functions;

  IF has_security_functions THEN
    ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.retention_alerts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS attendance_select_owner_staff ON public.attendance_logs;
    DROP POLICY IF EXISTS attendance_insert_owner_staff ON public.attendance_logs;
    DROP POLICY IF EXISTS retention_select_staff ON public.retention_alerts;
    DROP POLICY IF EXISTS retention_write_staff ON public.retention_alerts;

    CREATE POLICY attendance_select_owner_staff
      ON public.attendance_logs
      FOR SELECT
      TO authenticated
      USING (
        user_id = public.current_user_db_id()
        OR public.current_app_role() = 'admin'
        OR public.is_assigned_trainer(user_id::integer)
      );

    CREATE POLICY attendance_insert_owner_staff
      ON public.attendance_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = public.current_user_db_id()
        OR public.current_app_role() = 'admin'
        OR public.is_assigned_trainer(user_id::integer)
      );

    CREATE POLICY retention_select_staff
      ON public.retention_alerts
      FOR SELECT
      TO authenticated
      USING (
        public.current_app_role() = 'admin'
        OR public.is_assigned_trainer(user_id::integer)
      );

    CREATE POLICY retention_write_staff
      ON public.retention_alerts
      FOR ALL
      TO authenticated
      USING (
        public.current_app_role() = 'admin'
        OR public.is_assigned_trainer(user_id::integer)
      )
      WITH CHECK (
        public.current_app_role() = 'admin'
        OR public.is_assigned_trainer(user_id::integer)
      );
  END IF;
END $$;

-- 5) Verificacion final
select table_name
from information_schema.tables
where table_schema = 'public'
and table_name in ('attendance_logs', 'retention_alerts')
order by table_name;
