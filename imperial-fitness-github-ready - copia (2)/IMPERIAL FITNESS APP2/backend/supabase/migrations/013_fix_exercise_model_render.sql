-- ============================================================
-- IMPERIAL FITNESS - FIX RENDER EXERCISES + MODO CUIDADO
-- Migración segura: crea tablas si no existen y agrega columnas faltantes.
-- No borra datos existentes.
-- ============================================================

create table if not exists public.exercises (
  id varchar(120) primary key,
  name varchar(180) not null,
  segment varchar(30) not null default 'superior',
  movement varchar(30) not null default 'isolation',
  primary_muscle varchar(80) not null default 'general',
  muscle_groups_json text not null default '',
  equipment varchar(180) not null default 'Equipo Imperial Fitness',
  image_url varchar(700),
  level varchar(30) not null default 'todos',
  is_active integer not null default 1,
  needs_image_review integer not null default 0,
  coaching_notes text not null default '',
  created_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now()
);

alter table public.exercises add column if not exists segment varchar(30) not null default 'superior';
alter table public.exercises add column if not exists movement varchar(30) not null default 'isolation';
alter table public.exercises add column if not exists primary_muscle varchar(80) not null default 'general';
alter table public.exercises add column if not exists muscle_groups_json text not null default '';
alter table public.exercises add column if not exists equipment varchar(180) not null default 'Equipo Imperial Fitness';
alter table public.exercises add column if not exists image_url varchar(700);
alter table public.exercises add column if not exists level varchar(30) not null default 'todos';
alter table public.exercises add column if not exists is_active integer not null default 1;
alter table public.exercises add column if not exists needs_image_review integer not null default 0;
alter table public.exercises add column if not exists coaching_notes text not null default '';
alter table public.exercises add column if not exists created_at timestamp without time zone not null default now();
alter table public.exercises add column if not exists updated_at timestamp without time zone not null default now();

create index if not exists idx_exercises_segment on public.exercises(segment);
create index if not exists idx_exercises_movement on public.exercises(movement);
create index if not exists idx_exercises_primary_muscle on public.exercises(primary_muscle);
create index if not exists idx_exercises_equipment on public.exercises(equipment);
create index if not exists idx_exercises_level on public.exercises(level);
create index if not exists idx_exercises_is_active on public.exercises(is_active);

create table if not exists public.user_limitations (
  id bigserial primary key,
  client_id integer not null references public.users(id) on delete cascade,
  reported_by_user_id integer references public.users(id) on delete set null,
  body_area varchar(40) not null,
  severity varchar(30) not null default 'leve',
  comment text not null default '',
  status varchar(30) not null default 'active',
  coach_note text not null default '',
  created_at timestamp without time zone not null default now(),
  resolved_at timestamp without time zone
);

alter table public.user_limitations add column if not exists reported_by_user_id integer references public.users(id) on delete set null;
alter table public.user_limitations add column if not exists body_area varchar(40) not null default 'otro';
alter table public.user_limitations add column if not exists severity varchar(30) not null default 'leve';
alter table public.user_limitations add column if not exists comment text not null default '';
alter table public.user_limitations add column if not exists status varchar(30) not null default 'active';
alter table public.user_limitations add column if not exists coach_note text not null default '';
alter table public.user_limitations add column if not exists created_at timestamp without time zone not null default now();
alter table public.user_limitations add column if not exists resolved_at timestamp without time zone;

create index if not exists idx_user_limitations_client_id on public.user_limitations(client_id);
create index if not exists idx_user_limitations_body_area on public.user_limitations(body_area);
create index if not exists idx_user_limitations_severity on public.user_limitations(severity);
create index if not exists idx_user_limitations_status on public.user_limitations(status);
create index if not exists idx_user_limitations_created_at on public.user_limitations(created_at desc);

select table_name
from information_schema.tables
where table_schema = 'public'
and table_name in ('exercises', 'user_limitations')
order by table_name;
