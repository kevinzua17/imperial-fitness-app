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