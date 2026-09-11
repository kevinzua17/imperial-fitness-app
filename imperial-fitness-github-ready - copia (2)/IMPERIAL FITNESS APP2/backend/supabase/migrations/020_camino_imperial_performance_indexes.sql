-- Índices seguros para acelerar Camino Imperial y KPIs administrativos.
-- No cambia datos existentes ni crea columnas nuevas.

create index if not exists idx_user_habits_user_active_order
  on public.user_habits (user_id, active, sort_order, created_at);

create index if not exists idx_habit_completions_user_date
  on public.habit_completions (user_id, completion_date desc);

create index if not exists idx_habit_completions_user_habit_date
  on public.habit_completions (user_id, habit_id, completion_date desc);

create index if not exists idx_habit_completions_user_completed_date
  on public.habit_completions (user_id, completed, completion_date desc);

create index if not exists idx_strength_goals_user_status
  on public.strength_goals (user_id, status, created_at);

create index if not exists idx_strength_goal_logs_user_goal_created
  on public.strength_goal_logs (user_id, goal_id, created_at desc);

create index if not exists idx_xp_events_user_created
  on public.xp_events (user_id, created_at desc);

create index if not exists idx_gamification_notifications_user_unread
  on public.gamification_notifications (user_id, read_at, created_at desc);
