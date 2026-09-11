-- Reto Camino Imperial definitivo: creación robusta, métricas premium, objetivos racionales y escalabilidad 500 usuarios.
-- Ejecutar una sola vez después de 025_reto_premium_metricas_antifraude.sql.

create table if not exists public.challenges (
  id bigserial primary key,
  title varchar(180) not null,
  description text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  status varchar(30) not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_participants (
  id bigserial primary key,
  challenge_id bigint not null references public.challenges(id) on delete cascade,
  user_id bigint not null references public.users(id) on delete cascade,
  progress_value double precision not null default 0,
  joined_at timestamptz not null default now()
);

alter table public.challenges
  add column if not exists challenge_type varchar(60) default 'transformation_8w',
  add column if not exists price_cop integer default 80000,
  add column if not exists compare_at_cop integer,
  add column if not exists currency varchar(12) default 'COP',
  add column if not exists launch_badge varchar(80) default 'Precio de lanzamiento',
  add column if not exists slots_total integer default 50,
  add column if not exists duration_weeks integer default 8,
  add column if not exists guarantee_enabled integer default 1,
  add column if not exists min_completion_percent integer default 80,
  add column if not exists min_improvement_indicators integer default 2,
  add column if not exists refund_terms text default 'La garantía aplica si el participante cumple mínimo el 80% del reto, registra medición inicial y final, mantiene registros consistentes y no mejora en al menos 2 indicadores medibles.',
  add column if not exists config_json text default '{}',
  add column if not exists created_by bigint references public.users(id),
  add column if not exists updated_at timestamptz default now();

alter table public.challenge_participants
  add column if not exists status varchar(30) default 'active',
  add column if not exists payment_status varchar(30) default 'not_required',
  add column if not exists paid_amount_cop integer default 0,
  add column if not exists baseline_weight double precision,
  add column if not exists baseline_waist double precision,
  add column if not exists baseline_body_fat double precision,
  add column if not exists baseline_muscle_mass double precision,
  add column if not exists final_weight double precision,
  add column if not exists final_waist double precision,
  add column if not exists final_body_fat double precision,
  add column if not exists final_muscle_mass double precision,
  add column if not exists completion_percent integer default 0,
  add column if not exists improvement_indicators integer default 0,
  add column if not exists guarantee_status varchar(40) default 'en_proceso',
  add column if not exists admin_notes text default '',
  add column if not exists updated_at timestamptz default now();

update public.challenges
set challenge_type = coalesce(challenge_type, 'transformation_8w'),
    price_cop = coalesce(price_cop, 80000),
    currency = coalesce(currency, 'COP'),
    launch_badge = coalesce(launch_badge, 'Precio de lanzamiento'),
    slots_total = coalesce(slots_total, 50),
    duration_weeks = coalesce(duration_weeks, 8),
    guarantee_enabled = coalesce(guarantee_enabled, 1),
    min_completion_percent = coalesce(min_completion_percent, 80),
    min_improvement_indicators = coalesce(min_improvement_indicators, 2),
    refund_terms = coalesce(refund_terms, 'La garantía aplica si el participante cumple mínimo el 80% del reto, registra medición inicial y final, mantiene registros consistentes y no mejora en al menos 2 indicadores medibles.'),
    config_json = case
      when coalesce(config_json, '') = '' or coalesce(config_json, '{}') = '{}' then '{"training_days_per_week":3,"exclusive_enabled":true,"weekly_review_day":"Domingo","anti_fraud_review":true,"target_focus":"recomposition","weekly_review_required":true,"evidence_required":["medicion_inicial","checkins","habitos","cargas","medicion_final"]}'
      else config_json
    end,
    updated_at = coalesce(updated_at, now());

update public.challenge_participants
set status = coalesce(status, 'active'),
    payment_status = coalesce(payment_status, 'not_required'),
    paid_amount_cop = coalesce(paid_amount_cop, 0),
    completion_percent = coalesce(completion_percent, 0),
    improvement_indicators = coalesce(improvement_indicators, 0),
    guarantee_status = coalesce(guarantee_status, 'en_proceso'),
    admin_notes = coalesce(admin_notes, ''),
    updated_at = coalesce(updated_at, now());

-- Crea un reto premium por defecto si aún no existe. Queda activo para que el admin pueda editarlo sin empezar desde cero.
insert into public.challenges (
  title, description, starts_at, ends_at, status, challenge_type,
  price_cop, compare_at_cop, currency, launch_badge, slots_total, duration_weeks,
  guarantee_enabled, min_completion_percent, min_improvement_indicators, refund_terms, config_json
)
select
  'Reto Camino Imperial 8 Semanas',
  'Experiencia premium de transformación con seguimiento semanal, ranking, métricas verificables, entrenamiento, nutrición, hábitos, progresión de cargas, medición inicial/final y garantía condicionada por cumplimiento.',
  now(),
  now() + interval '8 weeks' - interval '1 minute',
  'active',
  'transformation_8w',
  80000,
  120000,
  'COP',
  'Precio de lanzamiento',
  50,
  8,
  1,
  80,
  2,
  'La garantía aplica si el participante cumple mínimo el 80% del reto, registra medición inicial y final, mantiene registros consistentes y no mejora en al menos 2 indicadores medibles.',
  '{"training_days_per_week":3,"exclusive_enabled":true,"weekly_review_day":"Domingo","anti_fraud_review":true,"target_focus":"recomposition","weekly_review_required":true,"evidence_required":["medicion_inicial","checkins","habitos","cargas","medicion_final"]}'
where not exists (
  select 1 from public.challenges
  where challenge_type = 'transformation_8w' and status in ('active','draft')
);

create unique index if not exists uq_challenge_participants_user_once
  on public.challenge_participants (challenge_id, user_id);
create index if not exists idx_challenges_status_type_created
  on public.challenges (status, challenge_type, created_at desc);
create index if not exists idx_challenges_dates
  on public.challenges (starts_at, ends_at);
create index if not exists idx_challenge_participants_challenge_status
  on public.challenge_participants (challenge_id, status, joined_at desc);
create index if not exists idx_challenge_participants_user_challenge
  on public.challenge_participants (user_id, challenge_id);
create index if not exists idx_challenge_participants_payment
  on public.challenge_participants (payment_status, status);
create index if not exists idx_habit_completions_user_completed_date
  on public.habit_completions (user_id, completed, completion_date desc);
create index if not exists idx_user_habits_user_active_frequency
  on public.user_habits (user_id, active, frequency_days);
create index if not exists idx_daily_checkins_user_date_desc
  on public.daily_checkins (user_id, checkin_date desc);
create index if not exists idx_strength_goal_logs_user_created_desc
  on public.strength_goal_logs (user_id, created_at desc);
create index if not exists idx_attendance_logs_user_checked_desc
  on public.attendance_logs (user_id, checked_at desc);
create index if not exists idx_progress_photos_client_created_desc
  on public.progress_photos (client_id, created_at desc);
create index if not exists idx_body_metrics_user_created_desc
  on public.body_metrics (user_id, created_at desc);
