begin;

alter table public.users add column if not exists service_tier varchar(30) not null default 'premium';
alter table public.users add column if not exists experience_mode varchar(30) not null default 'premium';
create index if not exists ix_users_service_tier on public.users(service_tier);
create index if not exists ix_users_experience_mode on public.users(experience_mode);

create table if not exists public.client_portal_links (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  token_hash varchar(255) not null unique,
  label varchar(120) not null default 'Seguimiento Imperial',
  expires_at timestamp without time zone not null,
  revoked_at timestamp without time zone null,
  last_used_at timestamp without time zone null,
  created_by bigint null references public.users(id) on delete set null,
  created_at timestamp without time zone not null default (timezone('utc', now()))
);
create index if not exists ix_client_portal_links_user_id on public.client_portal_links(user_id);
create index if not exists ix_client_portal_links_expires_at on public.client_portal_links(expires_at);

create table if not exists public.lite_sessions (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  source_link_id bigint null references public.client_portal_links(id) on delete cascade,
  session_hash varchar(255) not null unique,
  expires_at timestamp without time zone not null,
  revoked_at timestamp without time zone null,
  created_at timestamp without time zone not null default (timezone('utc', now()))
);
create index if not exists ix_lite_sessions_user_id on public.lite_sessions(user_id);
create index if not exists ix_lite_sessions_expires_at on public.lite_sessions(expires_at);

create table if not exists public.wellness_checkins (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  weight double precision null,
  training_sessions integer null,
  nutrition_adherence integer null,
  energy integer null,
  sleep_hours double precision null,
  hunger integer null,
  stress integer null,
  pain_present integer not null default 0,
  pain_score integer null,
  pain_area varchar(80) not null default '',
  pain_trigger varchar(300) not null default '',
  notes text not null default '',
  source varchar(30) not null default 'lite_link',
  submitted_at timestamp without time zone not null default (timezone('utc', now()))
);
create index if not exists ix_wellness_checkins_user_id on public.wellness_checkins(user_id);
create index if not exists ix_wellness_checkins_submitted_at on public.wellness_checkins(submitted_at);
create index if not exists ix_wellness_checkins_pain_score on public.wellness_checkins(pain_score);

create table if not exists public.plan_publications (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  plan_type varchar(30) not null,
  source_id bigint not null,
  title varchar(180) not null,
  version integer not null default 1,
  status varchar(30) not null default 'published',
  content_json text not null default '{}',
  warnings_json text not null default '[]',
  approved_by bigint null references public.users(id) on delete set null,
  published_at timestamp without time zone null,
  created_at timestamp without time zone not null default (timezone('utc', now()))
);
create index if not exists ix_plan_publications_user_id on public.plan_publications(user_id);
create index if not exists ix_plan_publications_status on public.plan_publications(status);
create index if not exists ix_plan_publications_type on public.plan_publications(plan_type);
create unique index if not exists uq_plan_publication_version on public.plan_publications(user_id, plan_type, version);

create table if not exists public.client_intake_surveys (
  id bigserial primary key,
  user_id bigint not null unique references public.users(id) on delete cascade,
  survey_json text not null default '{}',
  submitted_at timestamp without time zone not null default (timezone('utc', now())),
  updated_at timestamp without time zone not null default (timezone('utc', now()))
);
create index if not exists ix_client_intake_surveys_user_id on public.client_intake_surveys(user_id);

-- Defensa en profundidad para Supabase Data API: estas tablas contienen datos privados.
-- No se crean políticas para anon/authenticated. El backend usa su conexión PostgreSQL
-- privada/propietaria y además aplica autorización en FastAPI. No usar claves anon para estas tablas.
alter table public.client_portal_links enable row level security;
alter table public.lite_sessions enable row level security;
alter table public.wellness_checkins enable row level security;
alter table public.plan_publications enable row level security;
alter table public.client_intake_surveys enable row level security;

commit;
