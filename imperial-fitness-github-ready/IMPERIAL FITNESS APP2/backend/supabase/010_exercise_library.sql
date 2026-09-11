-- Imperial Fitness - Biblioteca visual de ejercicios
-- Ejecutar en Supabase SQL Editor antes de desplegar el backend en Render.

create table if not exists public.exercise_library (
  id bigserial primary key,
  name varchar(160) not null unique,
  muscle_group varchar(80) not null,
  primary_muscle varchar(80) default '',
  equipment varchar(120) default 'Gimnasio',
  difficulty varchar(40) default 'Principiante',
  image_url varchar(600) default '',
  instructions text default '',
  aliases varchar(500) default '',
  active integer not null default 1,
  created_by_user_id bigint references public.users(id) on delete set null,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now()
);

create index if not exists idx_exercise_library_muscle_group on public.exercise_library(muscle_group);
create index if not exists idx_exercise_library_difficulty on public.exercise_library(difficulty);
create index if not exists idx_exercise_library_active on public.exercise_library(active);
create index if not exists idx_exercise_library_created_by on public.exercise_library(created_by_user_id);

-- La app escribe por backend FastAPI. No se habilita acceso público directo desde el frontend.
-- Si más adelante se usa Supabase Auth directo, crear políticas RLS específicas antes de exponer esta tabla.
