-- Imperial Fitness - Red privada real
-- Ejecutar UNA VEZ en Supabase SQL Editor antes de redeployar Render.

alter table if exists public.community_posts
add column if not exists visibility varchar(30) not null default 'public';

update public.community_posts
set visibility = 'public'
where visibility is null or visibility not in ('public', 'friends', 'staff', 'trainer', 'private');

-- Conserva publicaciones antiguas y unifica el nombre de audiencia.
update public.community_posts set visibility = 'trainer' where visibility = 'staff';

create index if not exists idx_community_posts_visibility
on public.community_posts(visibility);

create index if not exists idx_community_posts_author_visibility_created
on public.community_posts(author_id, visibility, created_at desc);
