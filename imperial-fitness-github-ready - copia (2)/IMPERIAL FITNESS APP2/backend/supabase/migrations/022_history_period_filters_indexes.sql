-- Índices complementarios para filtros por periodo en historial y Camino Imperial.
-- Ejecutar después de 021_app_global_performance_indexes.sql.

create index if not exists idx_community_posts_author_created
  on public.community_posts (author_id, created_at desc);

create index if not exists idx_strength_goal_logs_user_created
  on public.strength_goal_logs (user_id, created_at desc);
