-- Audiencias estrictas para publicaciones de comunidad.
alter table public.community_posts
  add column if not exists visibility varchar(30) not null default 'public';

update public.community_posts set visibility = 'trainer' where visibility = 'staff';
update public.community_posts set visibility = 'public'
where visibility is null or visibility not in ('public', 'friends', 'trainer', 'private');

alter table public.community_posts drop constraint if exists community_posts_visibility_check;
alter table public.community_posts
  add constraint community_posts_visibility_check
  check (visibility in ('public', 'friends', 'trainer', 'private'));

create index if not exists idx_community_posts_visibility
on public.community_posts(visibility);
