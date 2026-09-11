-- Imperial Fitness v1.20.0 — diagnóstico SOLO LECTURA.
-- Puede ejecutarse antes y después de la migración 034.
-- No muestra correos, nombres, tokens ni hashes; solo conteos y estructura.

-- 1) Columnas esperadas de la versión 1.20.0.
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('users','body_metrics','diet_plans','exercises')
  and column_name in (
    'activity_level','workouts_per_week','average_daily_steps','occupation_activity',
    'bmr_source','status','version','calculation_json','based_on_metric_id',
    'approved_by','published_at','supersedes_plan_id','is_visible',
    'is_routine_eligible','review_status','source'
  )
order by table_name, ordinal_position;

-- 2) Conteo de columnas: después de migrar debe devolver 17.
select count(*) as columnas_v120_encontradas
from information_schema.columns
where table_schema = 'public'
  and table_name in ('users','body_metrics','diet_plans','exercises')
  and column_name in (
    'activity_level','workouts_per_week','average_daily_steps','occupation_activity',
    'bmr_source','status','version','calculation_json','based_on_metric_id',
    'approved_by','published_at','supersedes_plan_id','is_visible',
    'is_routine_eligible','review_status','source'
  );

-- 3) Integridad del flujo de dietas. Se usa to_jsonb para que funcione
-- incluso antes de que exista la columna status.
with diet_state as (
  select
    client_id,
    active,
    coalesce(
      to_jsonb(dp) ->> 'status',
      case when active = 1 then 'published' else 'archived' end
    ) as effective_status
  from public.diet_plans dp
)
select
  count(*) filter (where active = 1 and effective_status = 'published') as planes_publicados_activos,
  count(*) filter (where effective_status = 'draft') as borradores,
  count(*) filter (where effective_status = 'archived') as archivados,
  count(*) filter (where active = 1 and effective_status <> 'published') as inconsistencias_activas,
  count(*) filter (where active = 0 and effective_status = 'published') as publicados_inactivos
from diet_state;

with diet_state as (
  select
    client_id,
    active,
    coalesce(
      to_jsonb(dp) ->> 'status',
      case when active = 1 then 'published' else 'archived' end
    ) as effective_status
  from public.diet_plans dp
)
select count(*) as clientes_con_mas_de_un_plan_activo
from (
  select client_id
  from diet_state
  where active = 1 and effective_status = 'published'
  group by client_id
  having count(*) > 1
) duplicated_active;

-- 4) Seguridad de cuentas. Solo conteos; no expone valores sensibles.
select
  count(*) as usuarios,
  count(*) filter (where password_hash is null) as hashes_nulos,
  count(*) filter (where password_hash is not null and length(password_hash) < 20) as hashes_con_longitud_sospechosa,
  count(*) filter (where role is null or role not in ('admin','trainer','client')) as roles_invalidos
from public.users;

-- 5) Trazabilidad de TMB y biblioteca de ejercicios. to_jsonb permite
-- ejecutar estas consultas antes de que existan las columnas v1.20.0.
select
  count(*) filter (where bmr is not null) as mediciones_con_tmb,
  count(*) filter (where bmr is not null and nullif(to_jsonb(bm) ->> 'bmr_source', '') is null) as tmb_sin_fuente,
  count(*) filter (where to_jsonb(bm) ->> 'bmr_source' = 'inbody') as tmb_inbody_confirmadas,
  count(*) filter (where to_jsonb(bm) ->> 'bmr_source' = 'recorded_bmr') as tmb_historicas_sin_fuente_confirmada
from public.body_metrics bm;

select
  count(*) as ejercicios,
  count(*) filter (
    where coalesce((to_jsonb(e) ->> 'is_visible')::integer, 1) = 1
      and is_active = 1
      and coalesce(to_jsonb(e) ->> 'review_status', 'approved') = 'approved'
  ) as visibles_cliente,
  count(*) filter (
    where coalesce((to_jsonb(e) ->> 'is_routine_eligible')::integer, 1) = 1
      and is_active = 1
      and coalesce(to_jsonb(e) ->> 'review_status', 'approved') = 'approved'
  ) as elegibles_rutina,
  count(*) filter (where to_jsonb(e) ->> 'review_status' = 'pending') as pendientes_revision
from public.exercises e;
