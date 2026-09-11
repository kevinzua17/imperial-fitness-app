-- Imperial Fitness v1.21.0
-- Nutrición segura + datos necesarios para simplificar la experiencia sin perder trazabilidad.
-- Migración aditiva: no elimina registros ni modifica contraseñas.

begin;

select pg_advisory_xact_lock(hashtext('imperial_fitness_v1_21_0_migration_036'));

alter table public.users
  add column if not exists eating_pattern varchar(30),
  add column if not exists dietary_preferences text not null default '',
  add column if not exists excluded_foods text not null default '',
  add column if not exists food_allergies text not null default '',
  add column if not exists food_intolerances text not null default '',
  add column if not exists medical_conditions text not null default '',
  add column if not exists medications text not null default '',
  add column if not exists nutrition_reviewed_at timestamptz,
  add column if not exists nutrition_reviewed_by bigint references public.users(id) on delete set null;

alter table public.users
  drop constraint if exists users_eating_pattern_check;

alter table public.users
  add constraint users_eating_pattern_check
  check (eating_pattern is null or eating_pattern in ('omnivore','flexitarian','pescatarian','vegetarian','vegan'));

create index if not exists idx_users_nutrition_review_pending
  on public.users (role, nutrition_reviewed_at)
  where role = 'client';

commit;
