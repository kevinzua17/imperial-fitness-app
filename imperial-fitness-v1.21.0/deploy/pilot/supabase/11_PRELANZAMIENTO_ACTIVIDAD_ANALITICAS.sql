-- Imperial Fitness - cierre previo al lanzamiento 2026
-- Ejecutar DESPUÉS de 05, 06, 08, 9, 10 y backend/supabase/migrations/016.
-- No borra datos. Falla con un mensaje claro si faltan módulos obligatorios.

DO $$
DECLARE
  missing text[] := array[]::text[];
BEGIN
  IF to_regclass('public.daily_checkins') IS NULL THEN missing := array_append(missing, 'daily_checkins (ejecutar 05)'); END IF;
  IF to_regclass('public.user_gamification_status') IS NULL THEN missing := array_append(missing, 'user_gamification_status (ejecutar 06)'); END IF;
  IF to_regclass('public.membership_accounts') IS NULL THEN missing := array_append(missing, 'membership_accounts (ejecutar 08)'); END IF;
  IF to_regclass('public.membership_payments') IS NULL THEN missing := array_append(missing, 'membership_payments (ejecutar 08)'); END IF;
  IF to_regclass('public.user_limitations') IS NULL THEN missing := array_append(missing, 'user_limitations (ejecutar migración 016)'); END IF;
  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Faltan módulos obligatorios antes del lanzamiento: %', array_to_string(missing, ', ');
  END IF;
END $$;

alter table public.users
  add column if not exists last_login_at timestamptz;

create index if not exists idx_users_last_login_at
  on public.users(last_login_at desc);

alter table public.community_posts
  add column if not exists visibility varchar(30) not null default 'public';

update public.community_posts set visibility = 'trainer' where visibility = 'staff';
update public.community_posts set visibility = 'public'
where visibility is null or visibility not in ('public', 'friends', 'trainer', 'private');

alter table public.community_posts drop constraint if exists community_posts_visibility_check;
alter table public.community_posts
  add constraint community_posts_visibility_check
  check (visibility in ('public', 'friends', 'trainer', 'private'));

create index if not exists idx_community_posts_author_visibility_created
  on public.community_posts(author_id, visibility, created_at desc);

create index if not exists idx_daily_checkins_user_updated
  on public.daily_checkins(user_id, updated_at desc);
create index if not exists idx_membership_payments_status_reviewed
  on public.membership_payments(status, reviewed_at desc, submitted_at desc);
create index if not exists idx_user_limitations_active_user
  on public.user_limitations(user_id, status, severity);

-- Defensa adicional para acceso directo mediante Supabase Auth.
create or replace function public.can_view_community_post(p_author_id bigint, p_visibility text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_author_id = public.current_user_db_id()
    or p_visibility = 'public'
    or (
      p_visibility = 'friends'
      and exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and (
            (f.requester_id = p_author_id and f.addressee_id = public.current_user_db_id())
            or (f.addressee_id = p_author_id and f.requester_id = public.current_user_db_id())
          )
      )
    )
    or (
      p_visibility = 'trainer'
      and exists (
        select 1 from public.users author
        where author.id = p_author_id
          and author.assigned_trainer_id = public.current_user_db_id()
      )
    );
$$;

alter table public.community_posts enable row level security;
drop policy if exists community_posts_select on public.community_posts;
create policy community_posts_select on public.community_posts
for select to authenticated
using (public.can_view_community_post(author_id, visibility));

alter table public.post_comments enable row level security;
drop policy if exists comments_select on public.post_comments;
create policy comments_select on public.post_comments
for select to authenticated
using (
  exists (
    select 1 from public.community_posts p
    where p.id = post_comments.post_id
      and public.can_view_community_post(p.author_id, p.visibility)
  )
);

alter table public.post_reactions enable row level security;
drop policy if exists reactions_select on public.post_reactions;
create policy reactions_select on public.post_reactions
for select to authenticated
using (
  exists (
    select 1 from public.community_posts p
    where p.id = post_reactions.post_id
      and public.can_view_community_post(p.author_id, p.visibility)
  )
);


select 'prelaunch_ok' as status, now() as verified_at;
