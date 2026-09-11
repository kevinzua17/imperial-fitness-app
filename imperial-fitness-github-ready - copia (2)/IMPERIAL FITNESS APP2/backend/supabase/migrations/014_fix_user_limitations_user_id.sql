-- ============================================================
-- IMPERIAL FITNESS - Fix seguro user_limitations.user_id
-- Corrige el error: column "user_id" does not exist
-- No borra tablas ni datos existentes.
-- ============================================================

-- 1) Asegura que la tabla exista. Si ya existe, no la toca.
create table if not exists public.user_limitations (
  id bigserial primary key,
  created_at timestamptz not null default now()
);

-- 2) Agrega columnas necesarias de forma segura.
-- Nota: user_id se agrega nullable para no fallar si la tabla ya tenía filas antiguas.
alter table public.user_limitations
  add column if not exists user_id bigint;

alter table public.user_limitations
  add column if not exists body_area varchar(60) not null default 'otro';

alter table public.user_limitations
  add column if not exists severity varchar(30) not null default 'leve';

alter table public.user_limitations
  add column if not exists comment text not null default '';

alter table public.user_limitations
  add column if not exists trainer_note text not null default '';

alter table public.user_limitations
  add column if not exists status varchar(30) not null default 'active';

alter table public.user_limitations
  add column if not exists created_by bigint;

alter table public.user_limitations
  add column if not exists created_at timestamptz not null default now();

alter table public.user_limitations
  add column if not exists resolved_at timestamptz null;

-- 3) Agrega llaves foráneas solo si no existen.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_user_limitations_user_id'
  ) THEN
    ALTER TABLE public.user_limitations
      ADD CONSTRAINT fk_user_limitations_user_id
      FOREIGN KEY (user_id)
      REFERENCES public.users(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_user_limitations_created_by'
  ) THEN
    ALTER TABLE public.user_limitations
      ADD CONSTRAINT fk_user_limitations_created_by
      FOREIGN KEY (created_by)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 4) Agrega validaciones sin duplicarlas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_limitations_body_area'
  ) THEN
    ALTER TABLE public.user_limitations
      ADD CONSTRAINT chk_user_limitations_body_area
      CHECK (body_area in ('rodilla','hombro','lumbar','codo','muneca','cadera','tobillo','cuello','otro'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_limitations_severity'
  ) THEN
    ALTER TABLE public.user_limitations
      ADD CONSTRAINT chk_user_limitations_severity
      CHECK (severity in ('leve','moderada','alta'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_limitations_status'
  ) THEN
    ALTER TABLE public.user_limitations
      ADD CONSTRAINT chk_user_limitations_status
      CHECK (status in ('active','resolved'));
  END IF;
END $$;

-- 5) Índices seguros. Ahora user_id ya existe antes de crear este índice.
create index if not exists idx_user_limitations_user_id
  on public.user_limitations(user_id);

create index if not exists idx_user_limitations_status
  on public.user_limitations(status);

create index if not exists idx_user_limitations_body_area
  on public.user_limitations(body_area);

create index if not exists idx_user_limitations_created_at
  on public.user_limitations(created_at desc);

-- 6) Verificación final.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'user_limitations'
order by ordinal_position;
