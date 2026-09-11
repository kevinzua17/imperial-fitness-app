-- ============================================================
-- FIX SUPABASE: crear tabla sync_events antes de políticas RLS
-- Ejecutar si aparece: relation "public.sync_events" does not exist
-- Luego vuelve a ejecutar 00_RUN_ALL_IN_SUPABASE.sql completo.
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
