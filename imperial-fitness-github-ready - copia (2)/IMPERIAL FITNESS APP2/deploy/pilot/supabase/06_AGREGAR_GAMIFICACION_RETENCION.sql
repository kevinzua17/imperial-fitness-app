-- Imperial Fitness - Gamificación, rachas, XP, misiones y retención
-- Ejecutar una sola vez en Supabase > SQL Editor. Es seguro volver a ejecutarlo.

create table if not exists public.user_gamification_status (
  user_id integer primary key references public.users(id) on delete cascade,
  xp integer not null default 0,
  level integer not null default 1,
  prestige integer not null default 0,
  imperial_coins integer not null default 0,
  streak_shields integer not null default 0,
  title varchar(80) not null default 'Recluta',
  updated_at timestamp without time zone not null default now()
);

create table if not exists public.user_streaks (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  streak_type varchar(40) not null,
  current_count integer not null default 0,
  best_count integer not null default 0,
  last_date date,
  shields_used integer not null default 0,
  updated_at timestamp without time zone not null default now(),
  unique(user_id, streak_type)
);

create table if not exists public.user_badges (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  badge_key varchar(80) not null,
  title varchar(140) not null,
  description text not null default '',
  tier varchar(30) not null default 'bronze',
  earned_at timestamp without time zone not null default now(),
  unique(user_id, badge_key)
);

create table if not exists public.xp_events (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  event_key varchar(160) not null,
  points integer not null default 0,
  coins integer not null default 0,
  reason varchar(180) not null,
  created_at timestamp without time zone not null default now(),
  unique(user_id, event_key)
);

create table if not exists public.gamification_notifications (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  type varchar(50) not null default 'info',
  title varchar(160) not null,
  message text not null default '',
  read_at timestamp without time zone,
  created_at timestamp without time zone not null default now()
);

create table if not exists public.user_mission_logs (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  mission_key varchar(100) not null,
  mission_date date not null default current_date,
  status varchar(30) not null default 'completed',
  created_at timestamp without time zone not null default now(),
  unique(user_id, mission_key, mission_date)
);

create index if not exists idx_user_streaks_user on public.user_streaks(user_id);
create index if not exists idx_xp_events_user_created on public.xp_events(user_id, created_at desc);
create index if not exists idx_gamification_notifications_user_read on public.gamification_notifications(user_id, read_at, created_at desc);
create index if not exists idx_user_mission_logs_user_date on public.user_mission_logs(user_id, mission_date desc);

-- Inicializar estado para usuarios existentes.
insert into public.user_gamification_status (user_id)
select id from public.users
on conflict (user_id) do nothing;

-- Inicializar rachas base para usuarios existentes.
insert into public.user_streaks (user_id, streak_type)
select u.id, s.streak_type
from public.users u
cross join (values
  ('training'),
  ('nutrition'),
  ('water'),
  ('sleep'),
  ('progress'),
  ('mental'),
  ('perfect_day')
) as s(streak_type)
on conflict (user_id, streak_type) do nothing;
