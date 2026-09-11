-- Índices globales de rendimiento para acelerar login, dashboard, planes, rutinas y navegación general.
-- Ejecutar una sola vez en Supabase SQL Editor.

-- Login / sesión / usuarios
create index if not exists idx_users_email_lower on public.users (lower(email));
create index if not exists idx_users_role_status_created on public.users (role, status, created_at desc);
create index if not exists idx_users_assigned_trainer_role on public.users (assigned_trainer_id, role, status);
create index if not exists idx_refresh_tokens_hash_active on public.refresh_tokens (token_hash, revoked_at, expires_at);

-- Configuración visual / branding
create index if not exists idx_app_settings_key on public.app_settings (key);

-- Planes y rutinas iniciales
create index if not exists idx_diet_plans_client_active_created on public.diet_plans (client_id, active, created_at desc);
create index if not exists idx_diet_plans_active_created on public.diet_plans (active, created_at desc);
create index if not exists idx_assigned_routines_client_active_created on public.assigned_routines (client_id, active, created_at desc);
create index if not exists idx_assigned_routines_active_created on public.assigned_routines (active, created_at desc);
create index if not exists idx_assigned_routines_trainer_active on public.assigned_routines (trainer_id, active, created_at desc);

-- Dashboard, métricas y evolución
create index if not exists idx_daily_checkins_user_date on public.daily_checkins (user_id, checkin_date desc);
create index if not exists idx_body_metrics_user_created on public.body_metrics (user_id, created_at desc);
create index if not exists idx_progress_photos_client_created on public.progress_photos (client_id, created_at desc);
create index if not exists idx_workout_set_logs_user_created on public.workout_set_logs (user_id, created_at desc);

-- Comunidad, chat y contadores de navegación
create index if not exists idx_chat_messages_receiver_read_created on public.chat_messages (receiver_id, read_at, created_at desc);
create index if not exists idx_chat_messages_sender_receiver_created on public.chat_messages (sender_id, receiver_id, created_at desc);
create index if not exists idx_community_posts_created on public.community_posts (created_at desc);
create index if not exists idx_post_comments_post_created on public.post_comments (post_id, created_at desc);
create index if not exists idx_post_reactions_post_user on public.post_reactions (post_id, user_id);

-- Finanzas legacy
create index if not exists idx_payments_user_status_paid on public.payments (user_id, status, paid_at desc);
create index if not exists idx_memberships_user_status on public.memberships (user_id, status);

-- Membresías nuevas, si el módulo ya está instalado.
do $$
begin
  if to_regclass('public.membership_accounts') is not null then
    execute 'create index if not exists idx_membership_accounts_user_status_due on public.membership_accounts (user_id, status, next_payment_due)';
    execute 'create index if not exists idx_membership_accounts_status_due on public.membership_accounts (status, next_payment_due)';
  end if;
  if to_regclass('public.membership_payments') is not null then
    execute 'create index if not exists idx_membership_payments_user_status_submitted on public.membership_payments (user_id, status, submitted_at desc)';
    execute 'create index if not exists idx_membership_payments_status_submitted on public.membership_payments (status, submitted_at desc)';
  end if;
  if to_regclass('public.retention_alerts') is not null then
    execute 'create index if not exists idx_retention_alerts_status_created on public.retention_alerts (status, created_at desc)';
    execute 'create index if not exists idx_retention_alerts_user_status on public.retention_alerts (user_id, status)';
  end if;
end $$;
