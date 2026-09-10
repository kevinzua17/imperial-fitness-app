-- Imperial Fitness - Producción 500 usuarios + pagos con urgencia configurable
-- Ejecutar una sola vez después de 022_history_period_filters_indexes.sql.

-- Pagos por paquetes de meses. Permite aprobar 1, 3, 6 o más meses desde un solo comprobante.
alter table if exists public.membership_payments
  add column if not exists months_paid integer not null default 1;

alter table if exists public.membership_payments
  add column if not exists plan_id varchar(60);

do $$
begin
  if to_regclass('public.membership_payments') is not null
     and not exists (
       select 1 from pg_constraint
       where conname = 'chk_membership_payments_months_paid'
         and conrelid = 'public.membership_payments'::regclass
     ) then
    alter table public.membership_payments
      add constraint chk_membership_payments_months_paid
      check (months_paid between 1 and 24)
      not valid;
  end if;

  if to_regclass('public.membership_payments') is not null then
    begin
      alter table public.membership_payments validate constraint chk_membership_payments_months_paid;
    exception when others then
      null;
    end;
  end if;
end $$;

-- Índices para consultas rápidas con 500+ usuarios.
create index if not exists idx_users_clients_name on public.users (role, status, name asc);
create index if not exists idx_membership_accounts_user_due_status on public.membership_accounts (user_id, next_payment_due, status);
create index if not exists idx_membership_accounts_due_status on public.membership_accounts (next_payment_due, status);
create index if not exists idx_membership_payments_pending_user on public.membership_payments (status, user_id, submitted_at asc);
create index if not exists idx_membership_payments_user_submitted_desc on public.membership_payments (user_id, submitted_at desc);
create index if not exists idx_membership_payments_plan_id on public.membership_payments (plan_id);

-- Índices adicionales para Camino Imperial, hábitos, cargas y resumen administrativo.
create index if not exists idx_user_habits_user_active_frequency on public.user_habits (user_id, active, frequency_days);
create index if not exists idx_habit_completions_user_completed_date on public.habit_completions (user_id, completed, completion_date desc);
create index if not exists idx_habit_completions_user_date_habit on public.habit_completions (user_id, completion_date desc, habit_id);
create index if not exists idx_strength_goals_user_status_created on public.strength_goals (user_id, status, created_at desc);
create index if not exists idx_strength_goal_logs_user_goal_created on public.strength_goal_logs (user_id, goal_id, created_at desc);
create index if not exists idx_daily_checkins_user_date_desc on public.daily_checkins (user_id, checkin_date desc);
create index if not exists idx_user_gamification_status_level_xp on public.user_gamification_status (level desc, xp desc);
create index if not exists idx_user_streaks_user_type_count on public.user_streaks (user_id, streak_type, current_count desc);

-- Configuración editable desde Admin > Membresías y pagos.
insert into public.app_settings (key, value)
values
  ('membership_monthly_price_cop', '10000'),
  ('membership_launch_offer_enabled', '1'),
  ('membership_launch_offer_title', 'Precio de lanzamiento Imperial'),
  ('membership_launch_offer_badge', 'Oferta activa por tiempo limitado'),
  ('membership_launch_offer_deadline', ''),
  ('membership_launch_spots_limit', '0'),
  ('membership_launch_spots_used', '0'),
  ('membership_payment_plans_json', '[{"id":"monthly_launch","title":"1 mes Imperial","months":1,"amount":10000,"compare_at":49000,"badge":"Lanzamiento","highlight":true,"active":true},{"id":"quarterly_launch","title":"3 meses Imperial","months":3,"amount":30000,"compare_at":147000,"badge":"Mejor ahorro","highlight":false,"active":true},{"id":"semester_launch","title":"6 meses Imperial","months":6,"amount":54000,"compare_at":294000,"badge":"Más compromiso","highlight":false,"active":true}]')
on conflict (key) do update
set value = case
  when excluded.key = 'membership_monthly_price_cop' then excluded.value
  else public.app_settings.value
end,
updated_at = now();
