-- ============================================================
-- IMPERIAL FITNESS
-- Biblioteca editable de ejercicios para rutinas visuales
-- Ejecutar en Supabase SQL Editor antes de usar edición global.
-- No borra datos existentes.
-- ============================================================

create table if not exists public.exercises (
  id varchar(120) primary key,
  name varchar(180) not null,
  segment varchar(30) not null,
  movement varchar(30) not null,
  primary_muscle varchar(80) not null,
  muscle_groups_json text not null default '',
  equipment varchar(180) not null,
  image_url varchar(700),
  level varchar(30) not null default 'todos',
  is_active integer not null default 1,
  needs_image_review integer not null default 0,
  coaching_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exercises
  add column if not exists movement varchar(30) not null default 'isolation';

alter table public.exercises
  add column if not exists primary_muscle varchar(80) not null default 'general';

alter table public.exercises
  add column if not exists muscle_groups_json text not null default '';

alter table public.exercises
  add column if not exists equipment varchar(180) not null default 'Equipo Imperial Fitness';

alter table public.exercises
  add column if not exists image_url varchar(700);

alter table public.exercises
  add column if not exists level varchar(30) not null default 'todos';

alter table public.exercises
  add column if not exists is_active integer not null default 1;

alter table public.exercises
  add column if not exists needs_image_review integer not null default 0;

alter table public.exercises
  add column if not exists coaching_notes text not null default '';

alter table public.exercises
  add column if not exists created_at timestamptz not null default now();

alter table public.exercises
  add column if not exists updated_at timestamptz not null default now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exercises_segment') THEN
    ALTER TABLE public.exercises
      ADD CONSTRAINT chk_exercises_segment
      CHECK (segment in ('superior', 'inferior', 'core', 'cardio', 'full_body'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exercises_movement') THEN
    ALTER TABLE public.exercises
      ADD CONSTRAINT chk_exercises_movement
      CHECK (movement in ('push', 'pull', 'legs', 'hinge', 'isolation', 'core', 'cardio', 'full_body'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exercises_level') THEN
    ALTER TABLE public.exercises
      ADD CONSTRAINT chk_exercises_level
      CHECK (level in ('todos', 'principiante', 'intermedio', 'avanzado'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exercises_active') THEN
    ALTER TABLE public.exercises
      ADD CONSTRAINT chk_exercises_active
      CHECK (is_active in (0, 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exercises_image_review') THEN
    ALTER TABLE public.exercises
      ADD CONSTRAINT chk_exercises_image_review
      CHECK (needs_image_review in (0, 1));
  END IF;
END $$;

create index if not exists idx_exercises_name on public.exercises(name);
create index if not exists idx_exercises_segment on public.exercises(segment);
create index if not exists idx_exercises_movement on public.exercises(movement);
create index if not exists idx_exercises_primary_muscle on public.exercises(primary_muscle);
create index if not exists idx_exercises_equipment on public.exercises(equipment);
create index if not exists idx_exercises_active on public.exercises(is_active);

select table_name
from information_schema.tables
where table_schema = 'public'
and table_name = 'exercises';
