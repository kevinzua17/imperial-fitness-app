-- Imperial Fitness - verificación final de instalación
-- Ejecutar después de todo el orden indicado en backend/supabase/DEPLOY_ORDER.md.

with required_tables(table_name) as (
  values
    ('users'), ('foods'), ('diet_plans'), ('assigned_routines'), ('exercises'),
    ('user_limitations'), ('daily_checkins'), ('community_posts'), ('friendships'),
    ('user_gamification_status'), ('user_streaks'), ('user_mission_logs'),
    ('membership_accounts'), ('membership_payments'), ('expenses'), ('attendance_logs')
), present as (
  select table_name
  from information_schema.tables
  where table_schema = 'public'
)
select r.table_name,
       case when p.table_name is not null then 'OK' else 'FALTA' end as estado
from required_tables r
left join present p using (table_name)
order by estado desc, r.table_name;

select column_name,
       case when column_name in ('last_login_at') then 'OK' else 'REVISAR' end as estado
from information_schema.columns
where table_schema = 'public'
  and table_name = 'users'
  and column_name = 'last_login_at';

select column_name,
       case when column_name = 'visibility' then 'OK' else 'REVISAR' end as estado
from information_schema.columns
where table_schema = 'public'
  and table_name = 'community_posts'
  and column_name = 'visibility';
