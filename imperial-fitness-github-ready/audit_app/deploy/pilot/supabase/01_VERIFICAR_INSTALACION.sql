-- ============================================================
-- IMPERIAL FITNESS - VERIFICAR INSTALACIÓN EN SUPABASE
-- Ejecutar después de 00_PRIMERO_EJECUTAR_INSTALACION_COMPLETA.sql
-- Debe devolver las tablas principales creadas.
-- ============================================================

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'users',
    'refresh_tokens',
    'password_reset_tokens',
    'foods',
    'diet_plans',
    'routine_templates',
    'assigned_routines',
    'progress_photos',
    'body_metrics',
    'workout_set_logs',
    'sync_events',
    'community_posts',
    'post_comments',
    'post_reactions',
    'friendships',
    'challenges',
    'challenge_participants',
    'chat_messages',
    'reward_events',
    'reward_products',
    'reward_redemptions',
    'memberships',
    'payments',
    'expenses',
    'attendance_logs',
    'retention_alerts',
    'app_settings'
  )
order by table_name;
