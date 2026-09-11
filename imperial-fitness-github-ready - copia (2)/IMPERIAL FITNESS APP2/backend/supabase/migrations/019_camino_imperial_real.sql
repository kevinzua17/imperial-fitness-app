-- ============================================================
-- IMPERIAL FITNESS - CAMINO IMPERIAL REAL
-- Hábitos editables, seguimiento semanal, niveles, streaks y progresión de cargas.
-- Seguro para ejecutar más de una vez en Supabase SQL Editor.
-- ============================================================

create table if not exists public.user_gamification_status (
  user_id bigint primary key references public.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  prestige integer not null default 0 check (prestige >= 0),
  imperial_coins integer not null default 0 check (imperial_coins >= 0),
  streak_shields integer not null default 0 check (streak_shields >= 0),
  title varchar(80) not null default 'Recluta',
  updated_at timestamptz not null default now()
);

create table if not exists public.user_streaks (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  streak_type varchar(40) not null,
  current_count integer not null default 0 check (current_count >= 0),
  best_count integer not null default 0 check (best_count >= 0),
  last_date date,
  shields_used integer not null default 0 check (shields_used >= 0),
  updated_at timestamptz not null default now(),
  constraint uq_user_streak unique(user_id, streak_type)
);

create table if not exists public.user_badges (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  badge_key varchar(80) not null,
  title varchar(140) not null,
  description text not null default '',
  tier varchar(30) not null default 'bronze',
  earned_at timestamptz not null default now(),
  constraint uq_user_badge unique(user_id, badge_key)
);

create table if not exists public.xp_events (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  event_key varchar(180) not null,
  points integer not null default 0,
  coins integer not null default 0,
  reason varchar(180) not null,
  created_at timestamptz not null default now(),
  constraint uq_xp_event_once unique(user_id, event_key)
);

create table if not exists public.gamification_notifications (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  type varchar(50) not null default 'info',
  title varchar(160) not null,
  message text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.user_mission_logs (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  mission_key varchar(120) not null,
  mission_date date not null default current_date,
  status varchar(30) not null default 'completed',
  created_at timestamptz not null default now(),
  constraint uq_user_mission_day unique(user_id, mission_key, mission_date)
);

create table if not exists public.user_habits (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  title varchar(160) not null,
  category varchar(40) not null default 'custom' check (category in ('training','nutrition','water','sleep','mental','mobility','gym','custom')),
  target_type varchar(30) not null default 'boolean' check (target_type in ('boolean','number','weight','reps','minutes')),
  target_value double precision not null default 1 check (target_value >= 0),
  unit varchar(30) not null default 'check',
  frequency_days integer not null default 7 check (frequency_days between 1 and 7),
  sort_order integer not null default 1,
  active integer not null default 1 check (active in (0,1)),
  is_default integer not null default 0 check (is_default in (0,1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_completions (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  habit_id bigint not null references public.user_habits(id) on delete cascade,
  completion_date date not null default current_date,
  completed integer not null default 1 check (completed in (0,1)),
  current_value double precision not null default 1 check (current_value >= 0),
  note varchar(500) not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_habit_completion_day unique(user_id, habit_id, completion_date)
);

create table if not exists public.strength_goals (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  exercise_name varchar(160) not null,
  base_weight_kg double precision not null default 0 check (base_weight_kg >= 0 and base_weight_kg <= 500),
  current_weight_kg double precision not null default 0 check (current_weight_kg >= 0 and current_weight_kg <= 500),
  target_weight_kg double precision not null check (target_weight_kg >= 0 and target_weight_kg <= 500),
  target_reps integer not null default 8 check (target_reps between 1 and 50),
  increment_kg double precision not null default 2.5 check (increment_kg > 0 and increment_kg <= 25),
  target_date date,
  status varchar(30) not null default 'active' check (status in ('active','completed','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.strength_goal_logs (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  goal_id bigint not null references public.strength_goals(id) on delete cascade,
  exercise_name varchar(160) not null,
  weight_kg double precision not null check (weight_kg >= 0 and weight_kg <= 500),
  reps integer not null check (reps between 1 and 100),
  sets integer not null default 1 check (sets between 1 and 20),
  rir integer check (rir is null or rir between 0 and 10),
  note varchar(500) not null default '',
  next_weight_kg double precision not null default 0,
  deload_recommended integer not null default 0 check (deload_recommended in (0,1)),
  suggestion text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_user_streaks_user on public.user_streaks(user_id);
create index if not exists idx_xp_events_user_created on public.xp_events(user_id, created_at desc);
create index if not exists idx_gamification_notifications_user_read on public.gamification_notifications(user_id, read_at, created_at desc);
create index if not exists idx_user_mission_logs_user_date on public.user_mission_logs(user_id, mission_date desc);
create index if not exists idx_user_habits_user_active on public.user_habits(user_id, active, sort_order);
create index if not exists idx_habit_completions_user_date on public.habit_completions(user_id, completion_date desc);
create index if not exists idx_habit_completions_habit_date on public.habit_completions(habit_id, completion_date desc);
create index if not exists idx_strength_goals_user_status on public.strength_goals(user_id, status, created_at asc);
create index if not exists idx_strength_goal_logs_goal_created on public.strength_goal_logs(goal_id, created_at desc);
create index if not exists idx_strength_goal_logs_user_created on public.strength_goal_logs(user_id, created_at desc);

drop trigger if exists trg_user_habits_updated_at on public.user_habits;
create trigger trg_user_habits_updated_at
before update on public.user_habits
for each row execute function public.set_updated_at();

drop trigger if exists trg_habit_completions_updated_at on public.habit_completions;
create trigger trg_habit_completions_updated_at
before update on public.habit_completions
for each row execute function public.set_updated_at();

drop trigger if exists trg_strength_goals_updated_at on public.strength_goals;
create trigger trg_strength_goals_updated_at
before update on public.strength_goals
for each row execute function public.set_updated_at();

insert into public.user_gamification_status (user_id)
select id from public.users
on conflict (user_id) do nothing;

insert into public.user_streaks (user_id, streak_type)
select u.id, s.streak_type
from public.users u
cross join (values
  ('training'), ('nutrition'), ('water'), ('sleep'), ('progress'), ('mental'), ('perfect_day'), ('habit_consistency'), ('strength')
) as s(streak_type)
on conflict (user_id, streak_type) do nothing;

-- Hábitos base para usuarios existentes. Se crean solo si el usuario todavía no tiene hábitos.
insert into public.user_habits (user_id, title, category, target_type, target_value, unit, frequency_days, sort_order, active, is_default)
select u.id, seed.title, seed.category, seed.target_type, seed.target_value, seed.unit, 7, seed.sort_order, 1, 1
from public.users u
cross join (values
  ('Entrenar o cumplir descanso planificado','training','boolean',1,'check',1),
  ('Tomar 2 litros de agua','water','number',2,'L',2),
  ('Cumplir proteína del día','nutrition','boolean',1,'check',3),
  ('Dormir 7-8 horas','sleep','boolean',1,'check',4),
  ('Movilidad o estiramiento 10 min','mobility','minutes',10,'min',5),
  ('Registrar carga principal del entrenamiento','gym','boolean',1,'check',6),
  ('Técnica limpia en ejercicio base','gym','boolean',1,'check',7),
  ('Cardio suave o 8.000 pasos','training','boolean',1,'check',8)
) as seed(title, category, target_type, target_value, unit, sort_order)
where not exists (select 1 from public.user_habits h where h.user_id = u.id);

insert into public.strength_goals (user_id, exercise_name, base_weight_kg, current_weight_kg, target_weight_kg, target_reps, increment_kg, status)
select u.id, seed.exercise_name, seed.base_weight, seed.base_weight, seed.target_weight, seed.target_reps, seed.increment, 'active'
from public.users u
cross join (values
  ('Sentadilla libre',60,70,8,2.5),
  ('Press banca',40,45,8,2.5),
  ('Peso muerto',70,80,6,5)
) as seed(exercise_name, base_weight, target_weight, target_reps, increment)
where not exists (select 1 from public.strength_goals sg where sg.user_id = u.id);

-- RLS para uso directo desde Supabase si se activa el cliente Supabase en el futuro.
alter table public.user_gamification_status enable row level security;
alter table public.user_streaks enable row level security;
alter table public.user_badges enable row level security;
alter table public.xp_events enable row level security;
alter table public.gamification_notifications enable row level security;
alter table public.user_mission_logs enable row level security;
alter table public.user_habits enable row level security;
alter table public.habit_completions enable row level security;
alter table public.strength_goals enable row level security;
alter table public.strength_goal_logs enable row level security;

drop policy if exists user_habits_owner_staff on public.user_habits;
create policy user_habits_owner_staff on public.user_habits for all to authenticated
using (user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id))
with check (user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id));

drop policy if exists habit_completions_owner_staff on public.habit_completions;
create policy habit_completions_owner_staff on public.habit_completions for all to authenticated
using (user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id))
with check (user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id));

drop policy if exists strength_goals_owner_staff on public.strength_goals;
create policy strength_goals_owner_staff on public.strength_goals for all to authenticated
using (user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id))
with check (user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id));

drop policy if exists strength_goal_logs_owner_staff on public.strength_goal_logs;
create policy strength_goal_logs_owner_staff on public.strength_goal_logs for all to authenticated
using (user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id))
with check (user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id));
