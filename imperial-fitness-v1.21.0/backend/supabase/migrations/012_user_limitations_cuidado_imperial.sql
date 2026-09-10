-- ============================================================
-- IMPERIAL FITNESS - Modo Cuidado Imperial
-- Limitaciones físicas, molestias reportadas y adaptación de rutinas.
-- Migración segura: no borra datos existentes.
-- ============================================================

create table if not exists public.user_limitations (
  id bigserial primary key,
  client_id bigint not null references public.users(id) on delete cascade,
  reported_by_user_id bigint references public.users(id) on delete set null,
  body_area varchar(40) not null,
  severity varchar(30) not null default 'leve',
  comment text not null default '',
  status varchar(30) not null default 'active',
  coach_note text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz null
);

alter table public.user_limitations
  add column if not exists reported_by_user_id bigint references public.users(id) on delete set null;

alter table public.user_limitations
  add column if not exists body_area varchar(40) not null default 'otro';

alter table public.user_limitations
  add column if not exists severity varchar(30) not null default 'leve';

alter table public.user_limitations
  add column if not exists comment text not null default '';

alter table public.user_limitations
  add column if not exists status varchar(30) not null default 'active';

alter table public.user_limitations
  add column if not exists coach_note text not null default '';

alter table public.user_limitations
  add column if not exists created_at timestamptz not null default now();

alter table public.user_limitations
  add column if not exists resolved_at timestamptz null;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_limitations_body_area') THEN
    ALTER TABLE public.user_limitations
      ADD CONSTRAINT chk_user_limitations_body_area
      CHECK (body_area in ('rodilla','hombro','lumbar','codo','muneca','cadera','tobillo','cuello','otro'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_limitations_severity') THEN
    ALTER TABLE public.user_limitations
      ADD CONSTRAINT chk_user_limitations_severity
      CHECK (severity in ('leve','moderada','alta'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_limitations_status') THEN
    ALTER TABLE public.user_limitations
      ADD CONSTRAINT chk_user_limitations_status
      CHECK (status in ('active','monitoring','resolved'));
  END IF;
END $$;

create index if not exists idx_user_limitations_client_id on public.user_limitations(client_id);
create index if not exists idx_user_limitations_status on public.user_limitations(status);
create index if not exists idx_user_limitations_body_area on public.user_limitations(body_area);
create index if not exists idx_user_limitations_created_at on public.user_limitations(created_at desc);
create index if not exists idx_user_limitations_active_client on public.user_limitations(client_id, status, created_at desc);

select table_name
from information_schema.tables
where table_schema = 'public'
and table_name = 'user_limitations';
