-- ============================================================
-- Imperial Fitness v1.20.1
-- Migration 035 - Hotfix historial de medidas corporales
--
-- Objetivos:
-- 1. Restaurar compatibilidad con el historial de medidas.
-- 2. Completar measured_at y recorded_at.
-- 3. Registrar la fuente de BMR/TMB histórica.
-- 4. Crear índices seguros.
--
-- IMPORTANTE:
-- - No elimina registros.
-- - No modifica password_hash.
-- - No modifica usuarios.
-- - No modifica valores corporales.
-- - Se elimina el índice con COALESCE que producía ERROR 42P17.
-- ============================================================

begin;

-- Evita que esta migración se ejecute simultáneamente
-- desde dos procesos diferentes.
select pg_advisory_xact_lock(
  hashtext('imperial_fitness_v1_20_1_migration_035')
);


-- ============================================================
-- 1. VALIDACIONES PREVIAS
-- ============================================================

do $$
begin

  -- Verificar que exista la tabla body_metrics.
  if to_regclass('public.body_metrics') is null then
    raise exception
      'No existe public.body_metrics. No se realizó ningún cambio.';
  end if;

  -- Verificar que exista created_at.
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'body_metrics'
      and column_name = 'created_at'
  ) then
    raise exception
      'No existe public.body_metrics.created_at. No se realizó ningún cambio.';
  end if;

  -- Verificar que exista user_id.
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'body_metrics'
      and column_name = 'user_id'
  ) then
    raise exception
      'No existe public.body_metrics.user_id. No se realizó ningún cambio.';
  end if;

end
$$;


-- ============================================================
-- 2. AGREGAR measured_at Y recorded_at
--    CON EL MISMO TIPO DE created_at
-- ============================================================

do $$
declare
  v_created_at_type text;
begin

  -- Obtener exactamente el tipo de datos de created_at.
  select format_type(a.atttypid, a.atttypmod)
  into v_created_at_type
  from pg_attribute a
  join pg_class c
    on c.oid = a.attrelid
  join pg_namespace n
    on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'body_metrics'
    and a.attname = 'created_at'
    and a.attnum > 0
    and not a.attisdropped;

  if v_created_at_type is null then
    raise exception
      'No fue posible determinar el tipo de public.body_metrics.created_at.';
  end if;


  -- Crear measured_at únicamente si todavía no existe.
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'body_metrics'
      and column_name = 'measured_at'
  ) then

    execute format(
      'alter table public.body_metrics add column measured_at %s',
      v_created_at_type
    );

  end if;


  -- Crear recorded_at únicamente si todavía no existe.
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'body_metrics'
      and column_name = 'recorded_at'
  ) then

    execute format(
      'alter table public.body_metrics add column recorded_at %s',
      v_created_at_type
    );

  end if;

end
$$;


-- ============================================================
-- 3. AGREGAR bmr_source
-- ============================================================

alter table public.body_metrics
  add column if not exists bmr_source varchar(30);


-- ============================================================
-- 4. RECUPERAR FECHA DE MEDICIÓN HISTÓRICA
--
-- No se modifican los valores corporales.
-- Solamente se completa measured_at donde actualmente es NULL.
-- ============================================================

update public.body_metrics
set measured_at = created_at
where measured_at is null
  and created_at is not null;


-- ============================================================
-- 5. RECUPERAR FECHA DE REGISTRO HISTÓRICA
-- ============================================================

update public.body_metrics
set recorded_at = created_at
where recorded_at is null
  and created_at is not null;


-- ============================================================
-- 6. IDENTIFICAR BMR/TMB HISTÓRICO
--
-- Solamente se etiqueta el origen cuando existe un valor BMR.
-- El valor BMR NO se modifica.
-- ============================================================

update public.body_metrics
set bmr_source = 'recorded_bmr'
where bmr is not null
  and bmr_source is null;


-- ============================================================
-- 7. ÍNDICES
-- ============================================================

-- Historial de medidas de un usuario ordenado por fecha.
create index if not exists idx_body_metrics_user_measured_at_desc
  on public.body_metrics (
    user_id,
    measured_at desc
  );


-- Historial según fecha de registro.
create index if not exists idx_body_metrics_user_recorded_at_desc
  on public.body_metrics (
    user_id,
    recorded_at desc
  );


-- Consultas relacionadas con BMR/TMB.
create index if not exists idx_body_metrics_user_bmr_source
  on public.body_metrics (
    user_id,
    bmr_source,
    measured_at desc
  );


-- ============================================================
-- IMPORTANTE
--
-- NO SE CREA:
--
-- create index idx_body_metrics_user_effective_date_desc
-- on public.body_metrics (
--   user_id,
--   coalesce(measured_at, created_at) desc
-- );
--
-- Ese índice era el que podía producir:
--
-- ERROR: 42P17
-- functions in index expression must be marked IMMUTABLE
--
-- especialmente cuando measured_at y created_at tenían
-- tipos timestamp diferentes.
--
-- Además, measured_at ya queda completado con created_at
-- para los registros históricos.
-- ============================================================


commit;


-- ============================================================
-- 8. VERIFICACIÓN FINAL - SOLO LECTURA
-- ============================================================

select
  count(*) as medidas_totales,

  count(*) filter (
    where measured_at is null
  ) as medidas_sin_fecha_real,

  count(*) filter (
    where recorded_at is null
  ) as medidas_sin_fecha_registro,

  count(*) filter (
    where bmr is not null
      and bmr_source is null
  ) as tmb_sin_fuente

from public.body_metrics;


-- ============================================================
-- 9. VERIFICAR TIPOS DE FECHA
-- ============================================================

select
  column_name,
  data_type,
  udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'body_metrics'
  and column_name in (
    'created_at',
    'measured_at',
    'recorded_at',
    'bmr_source'
  )
order by column_name;