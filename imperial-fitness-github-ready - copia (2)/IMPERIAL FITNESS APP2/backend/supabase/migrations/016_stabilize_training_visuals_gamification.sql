-- ============================================================
-- IMPERIAL FITNESS - ESTABILIZACION VISUAL DE PLANES
-- Crea/actualiza tablas necesarias sin borrar datos existentes.
-- ============================================================

create table if not exists public.exercises (
  id bigserial primary key,
  name varchar(180) not null,
  description text not null default '',
  image_url varchar(700) not null default '',
  category varchar(80) not null default 'general',
  segment varchar(50) not null default 'superior',
  movement_pattern varchar(50) not null default 'isolation',
  primary_muscle varchar(120) not null default '',
  secondary_muscles text not null default '[]',
  equipment varchar(220) not null default '',
  level varchar(60) not null default 'todos',
  is_active integer not null default 1,
  coach_notes text not null default '',
  created_by bigint null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exercises add column if not exists description text not null default '';
alter table public.exercises add column if not exists image_url varchar(700) not null default '';
alter table public.exercises add column if not exists category varchar(80) not null default 'general';
alter table public.exercises add column if not exists segment varchar(50) not null default 'superior';
alter table public.exercises add column if not exists movement_pattern varchar(50) not null default 'isolation';
alter table public.exercises add column if not exists primary_muscle varchar(120) not null default '';
alter table public.exercises add column if not exists secondary_muscles text not null default '[]';
alter table public.exercises add column if not exists equipment varchar(220) not null default '';
alter table public.exercises add column if not exists level varchar(60) not null default 'todos';
alter table public.exercises add column if not exists is_active integer not null default 1;
alter table public.exercises add column if not exists coach_notes text not null default '';
alter table public.exercises add column if not exists created_by bigint null references public.users(id) on delete set null;
alter table public.exercises add column if not exists created_at timestamptz not null default now();
alter table public.exercises add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_exercises_name on public.exercises(name);
create index if not exists idx_exercises_segment on public.exercises(segment);
create index if not exists idx_exercises_primary_muscle on public.exercises(primary_muscle);
create index if not exists idx_exercises_is_active on public.exercises(is_active);

create table if not exists public.user_limitations (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  body_area varchar(60) not null default 'otro',
  severity varchar(30) not null default 'leve',
  comment text not null default '',
  trainer_note text not null default '',
  status varchar(30) not null default 'active',
  created_by bigint null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz null
);

alter table public.user_limitations add column if not exists user_id bigint null references public.users(id) on delete cascade;
alter table public.user_limitations add column if not exists body_area varchar(60) not null default 'otro';
alter table public.user_limitations add column if not exists severity varchar(30) not null default 'leve';
alter table public.user_limitations add column if not exists comment text not null default '';
alter table public.user_limitations add column if not exists trainer_note text not null default '';
alter table public.user_limitations add column if not exists status varchar(30) not null default 'active';
alter table public.user_limitations add column if not exists created_by bigint null references public.users(id) on delete set null;
alter table public.user_limitations add column if not exists created_at timestamptz not null default now();
alter table public.user_limitations add column if not exists resolved_at timestamptz null;

create index if not exists idx_user_limitations_user_id on public.user_limitations(user_id);
create index if not exists idx_user_limitations_status on public.user_limitations(status);
create index if not exists idx_user_limitations_area on public.user_limitations(body_area);

select table_name
from information_schema.tables
where table_schema = 'public'
and table_name in ('exercises', 'user_limitations')
order by table_name;
