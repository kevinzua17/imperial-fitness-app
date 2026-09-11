-- ============================================================
-- IMPERIAL FITNESS - RLS EXTENDIDO PARA MODULOS NUEVOS
-- Ejecutar despues de crear las tablas nuevas en Supabase.
-- ============================================================

alter table if exists public.assigned_routines enable row level security;
alter table if exists public.body_metrics enable row level security;
alter table if exists public.workout_set_logs enable row level security;
alter table if exists public.community_posts enable row level security;
alter table if exists public.post_comments enable row level security;
alter table if exists public.post_reactions enable row level security;
alter table if exists public.friendships enable row level security;
alter table if exists public.challenges enable row level security;
alter table if exists public.challenge_participants enable row level security;
alter table if exists public.chat_messages enable row level security;
alter table if exists public.reward_events enable row level security;
alter table if exists public.reward_products enable row level security;
alter table if exists public.reward_redemptions enable row level security;
alter table if exists public.memberships enable row level security;
alter table if exists public.payments enable row level security;
alter table if exists public.expenses enable row level security;
alter table if exists public.attendance_logs enable row level security;
alter table if exists public.retention_alerts enable row level security;
alter table if exists public.app_settings enable row level security;

-- ASSIGNED ROUTINES
drop policy if exists assigned_routines_select on public.assigned_routines;
drop policy if exists assigned_routines_write_staff on public.assigned_routines;
create policy assigned_routines_select on public.assigned_routines for select to authenticated using (
  client_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(client_id)
);
create policy assigned_routines_write_staff on public.assigned_routines for all to authenticated using (
  public.current_app_role() = 'admin' or public.is_assigned_trainer(client_id)
) with check (
  public.current_app_role() = 'admin' or public.is_assigned_trainer(client_id)
);

-- BODY METRICS AND WORKOUT LOGS
drop policy if exists body_metrics_select on public.body_metrics;
drop policy if exists body_metrics_insert_owner_staff on public.body_metrics;
create policy body_metrics_select on public.body_metrics for select to authenticated using (
  user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id)
);
create policy body_metrics_insert_owner_staff on public.body_metrics for insert to authenticated with check (
  user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id)
);

drop policy if exists workout_logs_select on public.workout_set_logs;
drop policy if exists workout_logs_insert_owner_staff on public.workout_set_logs;
create policy workout_logs_select on public.workout_set_logs for select to authenticated using (
  user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id)
);
create policy workout_logs_insert_owner_staff on public.workout_set_logs for insert to authenticated with check (
  user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id)
);

-- COMMUNITY
drop policy if exists community_posts_select on public.community_posts;
drop policy if exists community_posts_insert_auth on public.community_posts;
drop policy if exists community_posts_update_owner_admin on public.community_posts;
drop policy if exists community_posts_delete_owner_admin on public.community_posts;
create policy community_posts_select on public.community_posts for select to authenticated using (true);
create policy community_posts_insert_auth on public.community_posts for insert to authenticated with check (author_id = public.current_user_db_id());
create policy community_posts_update_owner_admin on public.community_posts for update to authenticated using (author_id = public.current_user_db_id() or public.current_app_role() = 'admin') with check (author_id = public.current_user_db_id() or public.current_app_role() = 'admin');
create policy community_posts_delete_owner_admin on public.community_posts for delete to authenticated using (author_id = public.current_user_db_id() or public.current_app_role() = 'admin');

drop policy if exists comments_select on public.post_comments;
drop policy if exists comments_insert_auth on public.post_comments;
drop policy if exists comments_delete_owner_admin on public.post_comments;
create policy comments_select on public.post_comments for select to authenticated using (true);
create policy comments_insert_auth on public.post_comments for insert to authenticated with check (author_id = public.current_user_db_id());
create policy comments_delete_owner_admin on public.post_comments for delete to authenticated using (author_id = public.current_user_db_id() or public.current_app_role() = 'admin');

drop policy if exists reactions_select on public.post_reactions;
drop policy if exists reactions_insert_owner on public.post_reactions;
drop policy if exists reactions_delete_owner on public.post_reactions;
create policy reactions_select on public.post_reactions for select to authenticated using (true);
create policy reactions_insert_owner on public.post_reactions for insert to authenticated with check (user_id = public.current_user_db_id());
create policy reactions_delete_owner on public.post_reactions for delete to authenticated using (user_id = public.current_user_db_id());

-- FRIENDSHIPS
drop policy if exists friendships_select_related on public.friendships;
drop policy if exists friendships_insert_requester on public.friendships;
drop policy if exists friendships_update_related on public.friendships;
drop policy if exists friendships_delete_related on public.friendships;
create policy friendships_select_related on public.friendships for select to authenticated using (requester_id = public.current_user_db_id() or addressee_id = public.current_user_db_id() or public.current_app_role() = 'admin');
create policy friendships_insert_requester on public.friendships for insert to authenticated with check (requester_id = public.current_user_db_id());
create policy friendships_update_related on public.friendships for update to authenticated using (requester_id = public.current_user_db_id() or addressee_id = public.current_user_db_id() or public.current_app_role() = 'admin') with check (requester_id = public.current_user_db_id() or addressee_id = public.current_user_db_id() or public.current_app_role() = 'admin');
create policy friendships_delete_related on public.friendships for delete to authenticated using (requester_id = public.current_user_db_id() or addressee_id = public.current_user_db_id() or public.current_app_role() = 'admin');

-- CHALLENGES
drop policy if exists challenges_select on public.challenges;
drop policy if exists challenges_write_staff on public.challenges;
create policy challenges_select on public.challenges for select to authenticated using (true);
create policy challenges_write_staff on public.challenges for all to authenticated using (public.is_admin_or_trainer()) with check (public.is_admin_or_trainer());

drop policy if exists challenge_participants_select on public.challenge_participants;
drop policy if exists challenge_participants_insert_owner on public.challenge_participants;
drop policy if exists challenge_participants_update_owner_staff on public.challenge_participants;
create policy challenge_participants_select on public.challenge_participants for select to authenticated using (user_id = public.current_user_db_id() or public.is_admin_or_trainer());
create policy challenge_participants_insert_owner on public.challenge_participants for insert to authenticated with check (user_id = public.current_user_db_id());
create policy challenge_participants_update_owner_staff on public.challenge_participants for update to authenticated using (user_id = public.current_user_db_id() or public.is_admin_or_trainer()) with check (user_id = public.current_user_db_id() or public.is_admin_or_trainer());

-- CHAT
drop policy if exists chat_select_related on public.chat_messages;
drop policy if exists chat_insert_sender on public.chat_messages;
create policy chat_select_related on public.chat_messages for select to authenticated using (sender_id = public.current_user_db_id() or receiver_id = public.current_user_db_id() or public.current_app_role() = 'admin');
create policy chat_insert_sender on public.chat_messages for insert to authenticated with check (sender_id = public.current_user_db_id());

-- REWARDS
drop policy if exists reward_events_select_owner_admin on public.reward_events;
drop policy if exists reward_events_write_admin on public.reward_events;
create policy reward_events_select_owner_admin on public.reward_events for select to authenticated using (user_id = public.current_user_db_id() or public.current_app_role() = 'admin');
create policy reward_events_write_admin on public.reward_events for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

drop policy if exists reward_products_select on public.reward_products;
drop policy if exists reward_products_write_admin on public.reward_products;
create policy reward_products_select on public.reward_products for select to authenticated using (active = 1 or public.current_app_role() = 'admin');
create policy reward_products_write_admin on public.reward_products for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

drop policy if exists reward_redemptions_select_owner_admin on public.reward_redemptions;
drop policy if exists reward_redemptions_insert_owner on public.reward_redemptions;
drop policy if exists reward_redemptions_update_admin on public.reward_redemptions;
create policy reward_redemptions_select_owner_admin on public.reward_redemptions for select to authenticated using (user_id = public.current_user_db_id() or public.current_app_role() = 'admin');
create policy reward_redemptions_insert_owner on public.reward_redemptions for insert to authenticated with check (user_id = public.current_user_db_id());
create policy reward_redemptions_update_admin on public.reward_redemptions for update to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- FINANCE ADMIN ONLY
drop policy if exists memberships_admin_only on public.memberships;
drop policy if exists payments_admin_only on public.payments;
drop policy if exists expenses_admin_only on public.expenses;
create policy memberships_admin_only on public.memberships for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy payments_admin_only on public.payments for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy expenses_admin_only on public.expenses for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- RETENTION
drop policy if exists attendance_select_owner_staff on public.attendance_logs;
drop policy if exists attendance_insert_owner_staff on public.attendance_logs;
create policy attendance_select_owner_staff on public.attendance_logs for select to authenticated using (user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id));
create policy attendance_insert_owner_staff on public.attendance_logs for insert to authenticated with check (user_id = public.current_user_db_id() or public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id));

drop policy if exists retention_select_staff on public.retention_alerts;
drop policy if exists retention_write_staff on public.retention_alerts;
create policy retention_select_staff on public.retention_alerts for select to authenticated using (public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id));
create policy retention_write_staff on public.retention_alerts for all to authenticated using (public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id)) with check (public.current_app_role() = 'admin' or public.is_assigned_trainer(user_id));

-- SETTINGS
drop policy if exists app_settings_select on public.app_settings;
drop policy if exists app_settings_write_admin on public.app_settings;
create policy app_settings_select on public.app_settings for select to authenticated using (true);
create policy app_settings_write_admin on public.app_settings for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');