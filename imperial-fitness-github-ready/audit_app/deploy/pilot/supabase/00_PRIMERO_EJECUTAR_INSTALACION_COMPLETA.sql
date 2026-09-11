-- ============================================================
-- IMPERIAL FITNESS - SQL ÚNICO PARA SUPABASE
-- Ejecutar en Supabase > SQL Editor > New query.
-- Orden incluido: schema + RLS + módulos extendidos + soft delete.
-- ============================================================

-- ============================================================
-- IMPERIAL FITNESS - SUPABASE POSTGRESQL FULL SCHEMA
-- Ejecutar PRIMERO en Supabase SQL Editor antes de RLS.
-- Luego ejecutar:
-- 001_enable_rls.sql
-- 002_rls_extended_modules.sql
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- UTILS
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- USERS / AUTH SUPPORT
-- ============================================================

create table if not exists public.users (
  id bigserial primary key,
  auth_user_id uuid unique,
  name varchar(120) not null,
  email varchar(160) not null unique,
  role varchar(30) not null default 'client' check (role in ('admin', 'trainer', 'client')),
  status varchar(30) not null default 'pending' check (status in ('pending', 'active', 'suspended', 'rejected')),
  avatar_url varchar(500),
  password_hash varchar(255) not null,
  token_version integer not null default 0,
  failed_login_attempts integer not null default 0,
  locked_until timestamptz,
  assigned_trainer_id bigint references public.users(id) on delete set null,
  tokens integer not null default 0 check (tokens >= 0),
  weight double precision,
  height double precision,
  body_fat double precision,
  muscle_mass double precision,
  goal varchar(160),
  created_at timestamptz not null default now()
);

create index if not exists idx_users_auth_user_id on public.users(auth_user_id);
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_status on public.users(status);
create index if not exists idx_users_assigned_trainer_id on public.users(assigned_trainer_id);

create table if not exists public.refresh_tokens (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  token_hash varchar(255) not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_refresh_tokens_user_id on public.refresh_tokens(user_id);
create index if not exists idx_refresh_tokens_expires_at on public.refresh_tokens(expires_at);
create index if not exists idx_refresh_tokens_revoked_at on public.refresh_tokens(revoked_at);

create table if not exists public.password_reset_tokens (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  token_hash varchar(255) not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_tokens_user_id on public.password_reset_tokens(user_id);
create index if not exists idx_password_reset_tokens_expires_at on public.password_reset_tokens(expires_at);
create index if not exists idx_password_reset_tokens_used_at on public.password_reset_tokens(used_at);

-- ============================================================
-- SETTINGS / BRANDING
-- ============================================================

create table if not exists public.app_settings (
  id bigserial primary key,
  key varchar(120) not null unique,
  value text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

-- ============================================================
-- NUTRITION
-- ============================================================

create table if not exists public.foods (
  id bigserial primary key,
  name varchar(160) not null unique,
  category varchar(30) not null,
  protein_per_100g double precision not null default 0 check (protein_per_100g >= 0),
  carbs_per_100g double precision not null default 0 check (carbs_per_100g >= 0),
  fat_per_100g double precision not null default 0 check (fat_per_100g >= 0),
  cals_per_100g double precision not null default 0 check (cals_per_100g >= 0),
  fiber_per_100g double precision not null default 0 check (fiber_per_100g >= 0),
  client_note text not null default '',
  trainer_note text not null default ''
);

create index if not exists idx_foods_name on public.foods(name);
create index if not exists idx_foods_category on public.foods(category);

create table if not exists public.diet_plans (
  id bigserial primary key,
  client_id bigint not null references public.users(id) on delete cascade,
  title varchar(160) not null,
  calories integer not null check (calories between 800 and 8000),
  protein integer not null default 0 check (protein >= 0),
  carbs integer not null default 0 check (carbs >= 0),
  fat integer not null default 0 check (fat >= 0),
  meals_json text not null default '[]',
  notes text not null default '',
  active integer not null default 1 check (active in (0, 1)),
  created_at timestamptz not null default now()
);

create index if not exists idx_diet_plans_client_id on public.diet_plans(client_id);
create index if not exists idx_diet_plans_created_at on public.diet_plans(created_at desc);
create index if not exists idx_diet_plans_active on public.diet_plans(active);

-- ============================================================
-- ROUTINES
-- ============================================================

create table if not exists public.routine_templates (
  id bigserial primary key,
  title varchar(160) not null unique,
  target_goal varchar(120) not null,
  level varchar(50) not null,
  days_per_week integer not null default 3 check (days_per_week between 1 and 7),
  description text not null default '',
  trainer_rationale text not null default '',
  payload_json text not null default '{}'
);

create index if not exists idx_routine_templates_title on public.routine_templates(title);
create index if not exists idx_routine_templates_goal on public.routine_templates(target_goal);
create index if not exists idx_routine_templates_level on public.routine_templates(level);

create table if not exists public.assigned_routines (
  id bigserial primary key,
  client_id bigint not null references public.users(id) on delete cascade,
  trainer_id bigint references public.users(id) on delete set null,
  title varchar(180) not null,
  objective text not null default '',
  payload_json text not null default '{}',
  active integer not null default 1 check (active in (0, 1)),
  created_at timestamptz not null default now()
);

create index if not exists idx_assigned_routines_client_id on public.assigned_routines(client_id);
create index if not exists idx_assigned_routines_trainer_id on public.assigned_routines(trainer_id);
create index if not exists idx_assigned_routines_active on public.assigned_routines(active);
create index if not exists idx_assigned_routines_created_at on public.assigned_routines(created_at desc);

-- ============================================================
-- PROGRESS / PHOTOS / WORKOUT LOGS
-- ============================================================

create table if not exists public.progress_photos (
  id bigserial primary key,
  client_id bigint not null references public.users(id) on delete cascade,
  image_url varchar(600) not null,
  label varchar(50) not null default 'Frente',
  weight double precision,
  body_fat double precision,
  created_at timestamptz not null default now()
);

create index if not exists idx_progress_photos_client_id on public.progress_photos(client_id);
create index if not exists idx_progress_photos_created_at on public.progress_photos(created_at desc);

create table if not exists public.body_metrics (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  weight double precision not null check (weight > 20 and weight <= 300),
  muscle_mass double precision not null check (muscle_mass >= 5 and muscle_mass <= 150),
  body_fat double precision not null check (body_fat >= 2 and body_fat <= 70),
  visceral_fat double precision,
  bmr double precision,
  bmi double precision,
  created_at timestamptz not null default now()
);

create index if not exists idx_body_metrics_user_id on public.body_metrics(user_id);
create index if not exists idx_body_metrics_created_at on public.body_metrics(created_at asc);

create table if not exists public.workout_set_logs (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  exercise_name varchar(160) not null,
  weight_kg double precision not null check (weight_kg >= 0 and weight_kg <= 500),
  reps integer not null check (reps between 1 and 100),
  set_number integer not null default 1 check (set_number between 1 and 20),
  rir integer check (rir between 0 and 10),
  notes text not null default '',
  suggestion text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_workout_set_logs_user_id on public.workout_set_logs(user_id);
create index if not exists idx_workout_set_logs_exercise_name on public.workout_set_logs(exercise_name);
create index if not exists idx_workout_set_logs_created_at on public.workout_set_logs(created_at asc);


-- ============================================================
-- SYNC EVENTS / AUDIT LOG
-- ============================================================

create table if not exists public.sync_events (
  id bigserial primary key,
  title varchar(160) not null,
  detail text not null default '',
  source varchar(120) not null,
  target varchar(120) not null,
  event_type varchar(50) not null default 'system',
  actor_user_id bigint references public.users(id) on delete set null,
  target_user_id bigint references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sync_events_event_type on public.sync_events(event_type);
create index if not exists idx_sync_events_actor_user_id on public.sync_events(actor_user_id);
create index if not exists idx_sync_events_target_user_id on public.sync_events(target_user_id);
create index if not exists idx_sync_events_created_at on public.sync_events(created_at desc);

-- ============================================================
-- COMMUNITY / SOCIAL / FRIENDSHIPS
-- ============================================================

create table if not exists public.community_posts (
  id bigserial primary key,
  author_id bigint not null references public.users(id) on delete cascade,
  content text not null default '',
  image_url varchar(600),
  tags varchar(500) not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_community_posts_author_id on public.community_posts(author_id);
create index if not exists idx_community_posts_created_at on public.community_posts(created_at desc);
create index if not exists idx_community_posts_tags on public.community_posts(tags);

create table if not exists public.post_comments (
  id bigserial primary key,
  post_id bigint not null references public.community_posts(id) on delete cascade,
  author_id bigint not null references public.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_post_comments_post_id on public.post_comments(post_id);
create index if not exists idx_post_comments_author_id on public.post_comments(author_id);
create index if not exists idx_post_comments_created_at on public.post_comments(created_at asc);

create table if not exists public.post_reactions (
  id bigserial primary key,
  post_id bigint not null references public.community_posts(id) on delete cascade,
  user_id bigint not null references public.users(id) on delete cascade,
  reaction_type varchar(30) not null default 'like',
  created_at timestamptz not null default now(),
  constraint uq_post_reaction_user unique (post_id, user_id, reaction_type)
);

create index if not exists idx_post_reactions_post_id on public.post_reactions(post_id);
create index if not exists idx_post_reactions_user_id on public.post_reactions(user_id);

create table if not exists public.friendships (
  id bigserial primary key,
  requester_id bigint not null references public.users(id) on delete cascade,
  addressee_id bigint not null references public.users(id) on delete cascade,
  status varchar(30) not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_friendship_not_self check (requester_id <> addressee_id)
);

create unique index if not exists uq_friendship_pair on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists idx_friendships_requester_id on public.friendships(requester_id);
create index if not exists idx_friendships_addressee_id on public.friendships(addressee_id);
create index if not exists idx_friendships_status on public.friendships(status);

drop trigger if exists trg_friendships_updated_at on public.friendships;
create trigger trg_friendships_updated_at
before update on public.friendships
for each row execute function public.set_updated_at();

-- ============================================================
-- CHALLENGES
-- ============================================================

create table if not exists public.challenges (
  id bigserial primary key,
  title varchar(180) not null,
  description text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  status varchar(30) not null default 'draft' check (status in ('draft', 'active', 'closed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists idx_challenges_status on public.challenges(status);
create index if not exists idx_challenges_created_at on public.challenges(created_at desc);

create table if not exists public.challenge_participants (
  id bigserial primary key,
  challenge_id bigint not null references public.challenges(id) on delete cascade,
  user_id bigint not null references public.users(id) on delete cascade,
  progress_value double precision not null default 0,
  joined_at timestamptz not null default now(),
  constraint uq_challenge_participant unique (challenge_id, user_id)
);

create index if not exists idx_challenge_participants_challenge_id on public.challenge_participants(challenge_id);
create index if not exists idx_challenge_participants_user_id on public.challenge_participants(user_id);

-- ============================================================
-- CHAT
-- ============================================================

create table if not exists public.chat_messages (
  id bigserial primary key,
  sender_id bigint not null references public.users(id) on delete cascade,
  receiver_id bigint not null references public.users(id) on delete cascade,
  text text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_sender_id on public.chat_messages(sender_id);
create index if not exists idx_chat_messages_receiver_id on public.chat_messages(receiver_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at asc);

-- ============================================================
-- REWARDS
-- ============================================================

create table if not exists public.reward_events (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  points integer not null,
  reason varchar(180) not null,
  source_type varchar(60) not null default 'manual',
  created_at timestamptz not null default now()
);

create index if not exists idx_reward_events_user_id on public.reward_events(user_id);
create index if not exists idx_reward_events_created_at on public.reward_events(created_at desc);

create table if not exists public.reward_products (
  id bigserial primary key,
  title varchar(180) not null,
  description text not null default '',
  cost integer not null check (cost > 0),
  stock integer not null default 0 check (stock >= 0),
  active integer not null default 1 check (active in (0, 1)),
  image_url varchar(600),
  created_at timestamptz not null default now()
);

create index if not exists idx_reward_products_active on public.reward_products(active);

create table if not exists public.reward_redemptions (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  product_id bigint not null references public.reward_products(id) on delete restrict,
  cost integer not null check (cost > 0),
  status varchar(30) not null default 'pending' check (status in ('pending', 'approved', 'delivered', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists idx_reward_redemptions_user_id on public.reward_redemptions(user_id);
create index if not exists idx_reward_redemptions_product_id on public.reward_redemptions(product_id);
create index if not exists idx_reward_redemptions_status on public.reward_redemptions(status);

-- ============================================================
-- FINANCE / MEMBERSHIPS
-- ============================================================

create table if not exists public.memberships (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  plan_name varchar(120) not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status varchar(30) not null default 'active' check (status in ('active', 'expired', 'cancelled', 'suspended')),
  created_at timestamptz not null default now(),
  constraint chk_membership_dates check (ends_at > starts_at)
);

create index if not exists idx_memberships_user_id on public.memberships(user_id);
create index if not exists idx_memberships_status on public.memberships(status);
create index if not exists idx_memberships_ends_at on public.memberships(ends_at);

create table if not exists public.payments (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  amount double precision not null check (amount > 0),
  method varchar(60) not null default 'manual',
  reference varchar(160),
  status varchar(30) not null default 'paid' check (status in ('pending', 'paid', 'failed', 'refunded')),
  paid_at timestamptz not null default now()
);

create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_paid_at on public.payments(paid_at desc);

create table if not exists public.expenses (
  id bigserial primary key,
  title varchar(160) not null,
  amount double precision not null check (amount > 0),
  category varchar(80) not null default 'operativo',
  spent_at timestamptz not null default now()
);

create index if not exists idx_expenses_category on public.expenses(category);
create index if not exists idx_expenses_spent_at on public.expenses(spent_at desc);

-- ============================================================
-- RETENTION / ATTENDANCE
-- ============================================================

create table if not exists public.attendance_logs (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  checked_at timestamptz not null default now(),
  source varchar(60) not null default 'manual'
);

create index if not exists idx_attendance_logs_user_id on public.attendance_logs(user_id);
create index if not exists idx_attendance_logs_checked_at on public.attendance_logs(checked_at desc);

create table if not exists public.retention_alerts (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  risk varchar(30) not null default 'medium' check (risk in ('low', 'medium', 'high')),
  reason text not null,
  suggested_action text not null default '',
  status varchar(30) not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_retention_alerts_user_id on public.retention_alerts(user_id);
create index if not exists idx_retention_alerts_status on public.retention_alerts(status);
create index if not exists idx_retention_alerts_risk on public.retention_alerts(risk);

-- ============================================================
-- END
-- ============================================================
-- ============================================================
-- MIGRACIÓN 001 - RLS
-- ============================================================
-- ============================================================
-- IMPERIAL FITNESS - SUPABASE ROW LEVEL SECURITY
-- Ejecutar en Supabase SQL Editor cuando migres a PostgreSQL.
-- ============================================================

-- Necesario para mapear usuarios de Supabase Auth con usuarios de la app.
alter table if exists public.users
  add column if not exists auth_user_id uuid unique;

alter table if exists public.users
  add column if not exists status text not null default 'pending'
  check (status in ('pending', 'active', 'suspended', 'rejected'));

create index if not exists idx_users_auth_user_id on public.users(auth_user_id);

-- Helpers seguros para evitar repetir lógica en políticas.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'client');
$$;

create or replace function public.current_user_db_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin_or_trainer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('admin', 'trainer');
$$;

create or replace function public.is_assigned_trainer(client_user_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users client
    where client.id = client_user_id
      and client.assigned_trainer_id = public.current_user_db_id()
  );
$$;

-- Activar RLS.
alter table if exists public.users enable row level security;
alter table if exists public.foods enable row level security;
alter table if exists public.diet_plans enable row level security;
alter table if exists public.routine_templates enable row level security;
alter table if exists public.progress_photos enable row level security;
alter table if exists public.sync_events enable row level security;

-- Forzar RLS incluso para dueños de tabla cuando aplique.
alter table if exists public.users force row level security;
alter table if exists public.foods force row level security;
alter table if exists public.diet_plans force row level security;
alter table if exists public.routine_templates force row level security;
alter table if exists public.progress_photos force row level security;
alter table if exists public.sync_events force row level security;

-- Limpiar políticas previas si estás re-ejecutando.
drop policy if exists users_select_own_or_staff on public.users;
drop policy if exists users_update_own_or_admin on public.users;
drop policy if exists users_insert_admin_only on public.users;
drop policy if exists foods_select_authenticated on public.foods;
drop policy if exists foods_write_staff_only on public.foods;
drop policy if exists routines_select_authenticated on public.routine_templates;
drop policy if exists routines_write_staff_only on public.routine_templates;
drop policy if exists diet_select_owner_trainer_admin on public.diet_plans;
drop policy if exists diet_write_trainer_admin on public.diet_plans;
drop policy if exists photos_select_owner_trainer_admin on public.progress_photos;
drop policy if exists photos_insert_owner_trainer_admin on public.progress_photos;
drop policy if exists sync_select_related on public.sync_events;
drop policy if exists sync_insert_authenticated on public.sync_events;

-- USERS
create policy users_select_own_or_staff
on public.users
for select
to authenticated
using (
  (auth_user_id = auth.uid() and status = 'active')
  or public.is_admin_or_trainer()
);

create policy users_update_own_or_admin
on public.users
for update
to authenticated
using (
  auth_user_id = auth.uid()
  or public.current_app_role() = 'admin'
)
with check (
  auth_user_id = auth.uid()
  or public.current_app_role() = 'admin'
);

create policy users_insert_admin_only
on public.users
for insert
to authenticated
with check (public.current_app_role() = 'admin');

-- FOODS: clientes pueden leer alimentos necesarios para equivalencias; solo staff escribe.
create policy foods_select_authenticated
on public.foods
for select
to authenticated
using (true);

create policy foods_write_staff_only
on public.foods
for all
to authenticated
using (public.is_admin_or_trainer())
with check (public.is_admin_or_trainer());

-- ROUTINES
create policy routines_select_authenticated
on public.routine_templates
for select
to authenticated
using (true);

create policy routines_write_staff_only
on public.routine_templates
for all
to authenticated
using (public.is_admin_or_trainer())
with check (public.is_admin_or_trainer());

-- DIET PLANS
create policy diet_select_owner_trainer_admin
on public.diet_plans
for select
to authenticated
using (
  client_id = public.current_user_db_id()
  or public.current_app_role() = 'admin'
  or public.is_assigned_trainer(client_id)
);

create policy diet_write_trainer_admin
on public.diet_plans
for all
to authenticated
using (
  public.current_app_role() = 'admin'
  or public.is_assigned_trainer(client_id)
)
with check (
  public.current_app_role() = 'admin'
  or public.is_assigned_trainer(client_id)
);

-- PROGRESS PHOTOS
create policy photos_select_owner_trainer_admin
on public.progress_photos
for select
to authenticated
using (
  client_id = public.current_user_db_id()
  or public.current_app_role() = 'admin'
  or public.is_assigned_trainer(client_id)
);

create policy photos_insert_owner_trainer_admin
on public.progress_photos
for insert
to authenticated
with check (
  client_id = public.current_user_db_id()
  or public.current_app_role() = 'admin'
  or public.is_assigned_trainer(client_id)
);

-- SYNC EVENTS
create policy sync_select_related
on public.sync_events
for select
to authenticated
using (true);

create policy sync_insert_authenticated
on public.sync_events
for insert
to authenticated
with check (true);

-- IMPORTANTE:
-- Nunca uses SUPABASE_SERVICE_ROLE_KEY en React, Flutter, Expo ni navegador.
-- Esa llave solo vive en backend Python o funciones server-side.
-- ============================================================
-- MIGRACIÓN 002 - RLS EXTENDED MODULES
-- ============================================================
-- ============================================================
-- IMPERIAL FITNESS - RLS EXTENDIDO PARA MODULOS NUEVOS
-- Ejecutar despues de crear las tablas nuevas en Supabase.
-- ============================================================

alter table if exists public.assigned_routines enable row level security;
alter table if exists public.body_metrics enable row level security;
alter table if exists public.workout_set_logs enable row level security;
alter table if exists public.community_posts enable row level security;
alter table if exists public.post_comments enable row level security;
alter table if exists public.post_reactions enable row level security;
alter table if exists public.friendships enable row level security;
alter table if exists public.challenges enable row level security;
alter table if exists public.challenge_participants enable row level security;
alter table if exists public.chat_messages enable row level security;
alter table if exists public.reward_events enable row level security;
alter table if exists public.reward_products enable row level security;
alter table if exists public.reward_redemptions enable row level security;
alter table if exists public.memberships enable row level security;
alter table if exists public.payments enable row level security;
alter table if exists public.expenses enable row level security;
alter table if exists public.attendance_logs enable row level security;
alter table if exists public.retention_alerts enable row level security;
alter table if exists public.app_settings enable row level security;

-- ASSIGNED ROUTINES
drop policy if exists assigned_routines_select on public.assigned_routines;
drop policy if exists assigned_routines_write_staff on public.assigned_routines;
create policy assigned_routines_select on public.assigned_routines for select to authenticated using (
  client_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(client_id)
);
create policy assigned_routines_write_staff on public.assigned_routines for all to authenticated using (
  public.current_app_role() = 'admin' or public.is_assigned_trainer(client_id)
) with check (
  public.current_app_role() = 'admin' or public.is_assigned_trainer(client_id)
);

-- BODY METRICS AND WORKOUT LOGS
drop policy if exists body_metrics_select on public.body_metrics;
drop policy if exists body_metrics_insert_owner_staff on public.body_metrics;
create policy body_metrics_select on public.body_metrics for select to authenticated using (
  user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id)
);
create policy body_metrics_insert_owner_staff on public.body_metrics for insert to authenticated with check (
  user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id)
);

drop policy if exists workout_logs_select on public.workout_set_logs;
drop policy if exists workout_logs_insert_owner_staff on public.workout_set_logs;
create policy workout_logs_select on public.workout_set_logs for select to authenticated using (
  user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id)
);
create policy workout_logs_insert_owner_staff on public.workout_set_logs for insert to authenticated with check (
  user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id)
);

-- COMMUNITY
drop policy if exists community_posts_select on public.community_posts;
drop policy if exists community_posts_insert_auth on public.community_posts;
drop policy if exists community_posts_update_owner_admin on public.community_posts;
drop policy if exists community_posts_delete_owner_admin on public.community_posts;
create policy community_posts_select on public.community_posts for select to authenticated using (true);
create policy community_posts_insert_auth on public.community_posts for insert to authenticated with check (author_id = public.current_user_db_id());
create policy community_posts_update_owner_admin on public.community_posts for update to authenticated using (author_id = public.current_user_db_id() or public.current_app_role() = 'admin') with check (author_id = public.current_user_db_id() or public.current_app_role() = 'admin');
create policy community_posts_delete_owner_admin on public.community_posts for delete to authenticated using (author_id = public.current_user_db_id() or public.current_app_role() = 'admin');

drop policy if exists comments_select on public.post_comments;
drop policy if exists comments_insert_auth on public.post_comments;
drop policy if exists comments_delete_owner_admin on public.post_comments;
create policy comments_select on public.post_comments for select to authenticated using (true);
create policy comments_insert_auth on public.post_comments for insert to authenticated with check (author_id = public.current_user_db_id());
create policy comments_delete_owner_admin on public.post_comments for delete to authenticated using (author_id = public.current_user_db_id() or public.current_app_role() = 'admin');

drop policy if exists reactions_select on public.post_reactions;
drop policy if exists reactions_insert_owner on public.post_reactions;
drop policy if exists reactions_delete_owner on public.post_reactions;
create policy reactions_select on public.post_reactions for select to authenticated using (true);
create policy reactions_insert_owner on public.post_reactions for insert to authenticated with check (user_id = public.current_user_db_id());
create policy reactions_delete_owner on public.post_reactions for delete to authenticated using (user_id = public.current_user_db_id());

-- FRIENDSHIPS
drop policy if exists friendships_select_related on public.friendships;
drop policy if exists friendships_insert_requester on public.friendships;
drop policy if exists friendships_update_related on public.friendships;
drop policy if exists friendships_delete_related on public.friendships;
create policy friendships_select_related on public.friendships for select to authenticated using (requester_id = public.current_user_db_id() or addressee_id = public.current_user_db_id() or public.current_app_role() = 'admin');
create policy friendships_insert_requester on public.friendships for insert to authenticated with check (requester_id = public.current_user_db_id());
create policy friendships_update_related on public.friendships for update to authenticated using (requester_id = public.current_user_db_id() or addressee_id = public.current_user_db_id() or public.current_app_role() = 'admin') with check (requester_id = public.current_user_db_id() or addressee_id = public.current_user_db_id() or public.current_app_role() = 'admin');
create policy friendships_delete_related on public.friendships for delete to authenticated using (requester_id = public.current_user_db_id() or addressee_id = public.current_user_db_id() or public.current_app_role() = 'admin');

-- CHALLENGES
drop policy if exists challenges_select on public.challenges;
drop policy if exists challenges_write_staff on public.challenges;
create policy challenges_select on public.challenges for select to authenticated using (true);
create policy challenges_write_staff on public.challenges for all to authenticated using (public.is_admin_or_trainer()) with check (public.is_admin_or_trainer());

drop policy if exists challenge_participants_select on public.challenge_participants;
drop policy if exists challenge_participants_insert_owner on public.challenge_participants;
drop policy if exists challenge_participants_update_owner_staff on public.challenge_participants;
create policy challenge_participants_select on public.challenge_participants for select to authenticated using (user_id = public.current_user_db_id() or public.is_admin_or_trainer());
create policy challenge_participants_insert_owner on public.challenge_participants for insert to authenticated with check (user_id = public.current_user_db_id());
create policy challenge_participants_update_owner_staff on public.challenge_participants for update to authenticated using (user_id = public.current_user_db_id() or public.is_admin_or_trainer()) with check (user_id = public.current_user_db_id() or public.is_admin_or_trainer());

-- CHAT
drop policy if exists chat_select_related on public.chat_messages;
drop policy if exists chat_insert_sender on public.chat_messages;
create policy chat_select_related on public.chat_messages for select to authenticated using (sender_id = public.current_user_db_id() or receiver_id = public.current_user_db_id() or public.current_app_role() = 'admin');
create policy chat_insert_sender on public.chat_messages for insert to authenticated with check (sender_id = public.current_user_db_id());

-- REWARDS
drop policy if exists reward_events_select_owner_admin on public.reward_events;
drop policy if exists reward_events_write_admin on public.reward_events;
create policy reward_events_select_owner_admin on public.reward_events for select to authenticated using (user_id = public.current_user_db_id() or public.current_app_role() = 'admin');
create policy reward_events_write_admin on public.reward_events for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

drop policy if exists reward_products_select on public.reward_products;
drop policy if exists reward_products_write_admin on public.reward_products;
create policy reward_products_select on public.reward_products for select to authenticated using (active = 1 or public.current_app_role() = 'admin');
create policy reward_products_write_admin on public.reward_products for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

drop policy if exists reward_redemptions_select_owner_admin on public.reward_redemptions;
drop policy if exists reward_redemptions_insert_owner on public.reward_redemptions;
drop policy if exists reward_redemptions_update_admin on public.reward_redemptions;
create policy reward_redemptions_select_owner_admin on public.reward_redemptions for select to authenticated using (user_id = public.current_user_db_id() or public.current_app_role() = 'admin');
create policy reward_redemptions_insert_owner on public.reward_redemptions for insert to authenticated with check (user_id = public.current_user_db_id());
create policy reward_redemptions_update_admin on public.reward_redemptions for update to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- FINANCE ADMIN ONLY
drop policy if exists memberships_admin_only on public.memberships;
drop policy if exists payments_admin_only on public.payments;
drop policy if exists expenses_admin_only on public.expenses;
create policy memberships_admin_only on public.memberships for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy payments_admin_only on public.payments for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy expenses_admin_only on public.expenses for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- RETENTION
drop policy if exists attendance_select_owner_staff on public.attendance_logs;
drop policy if exists attendance_insert_owner_staff on public.attendance_logs;
create policy attendance_select_owner_staff on public.attendance_logs for select to authenticated using (user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id));
create policy attendance_insert_owner_staff on public.attendance_logs for insert to authenticated with check (user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id));

drop policy if exists retention_select_staff on public.retention_alerts;
drop policy if exists retention_write_staff on public.retention_alerts;
create policy retention_select_staff on public.retention_alerts for select to authenticated using (public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id));
create policy retention_write_staff on public.retention_alerts for all to authenticated using (public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id)) with check (public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id));

-- SETTINGS
drop policy if exists app_settings_select on public.app_settings;
drop policy if exists app_settings_write_admin on public.app_settings;
create policy app_settings_select on public.app_settings for select to authenticated using (true);
create policy app_settings_write_admin on public.app_settings for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
-- ============================================================
-- MIGRACIÓN 003 - DIET PLAN SOFT DELETE
-- ============================================================
-- Fase 6: permite retirar planes nutricionales sin borrar historial.
alter table public.diet_plans
  add column if not exists active integer not null default 1 check (active in (0, 1));

create index if not exists idx_diet_plans_active on public.diet_plans(active);
