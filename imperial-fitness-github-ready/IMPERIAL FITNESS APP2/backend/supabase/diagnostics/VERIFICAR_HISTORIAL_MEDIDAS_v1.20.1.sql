-- Imperial Fitness v1.20.1
-- Diagnóstico de solo lectura. No modifica ningún dato.

-- 1. Total e integridad de las medidas.
select
  count(*) as medidas_totales,
  count(distinct user_id) as usuarios_con_medidas,
  count(*) filter (where user_id is null) as medidas_sin_usuario,
  count(*) filter (where measured_at is null) as medidas_sin_fecha_real,
  count(*) filter (where recorded_at is null) as medidas_sin_fecha_registro
from public.body_metrics;

-- 2. Medidas por usuario para confirmar dónde están los historiales.
select
  u.id as usuario_id,
  u.name as usuario,
  u.role,
  count(bm.id) as cantidad_medidas,
  min(coalesce(bm.measured_at, bm.created_at)) as primera_medida,
  max(coalesce(bm.measured_at, bm.created_at)) as ultima_medida
from public.users u
left join public.body_metrics bm
  on bm.user_id = u.id
group by u.id, u.name, u.role
having count(bm.id) > 0
order by cantidad_medidas desc, u.name asc;

-- 3. Registros huérfanos: deben ser 0.
select count(*) as medidas_huerfanas
from public.body_metrics bm
left join public.users u
  on u.id = bm.user_id
where u.id is null;

-- 4. Columnas requeridas por la versión 1.20.1.
select
  count(*) as columnas_historial_encontradas
from information_schema.columns
where table_schema = 'public'
  and table_name = 'body_metrics'
  and column_name in ('measured_at', 'recorded_at', 'bmr_source');
