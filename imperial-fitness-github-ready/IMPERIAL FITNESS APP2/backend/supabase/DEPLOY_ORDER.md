# Imperial Fitness — orden SQL de lanzamiento

En producción no se usa `Base.metadata.create_all()` ni el `seed.py` demo. La fuente de verdad es Supabase y las cuentas reales se crean desde el panel administrativo.

## Instalación nueva

Ejecutar en **Supabase → SQL Editor**, en este orden:

1. `deploy/pilot/supabase/00_RUN_ALL_IN_SUPABASE.sql`
2. `deploy/pilot/supabase/05_AGREGAR_CHECKIN_DIARIO_Y_WHATSAPP.sql`
3. `deploy/pilot/supabase/06_AGREGAR_GAMIFICACION_RETENCION.sql`
4. `deploy/pilot/supabase/07_AGREGAR_SOLICITUDES_RECUPERACION_ACCESO.sql`
5. `deploy/pilot/supabase/08_AGREGAR_MEMBRESIAS_PAGOS_NEQUI.sql`
6. `deploy/pilot/supabase/9_AGREGAR_CONTROL_ACCESO_MEMBRESIA.sql`
7. `backend/supabase/migrations/016_stabilize_training_visuals_gamification.sql`
8. `backend/supabase/migrations/018_user_demographics_inbody.sql`
9. `backend/supabase/migrations/019_camino_imperial_real.sql`
10. `backend/supabase/migrations/020_camino_imperial_performance_indexes.sql`
11. `backend/supabase/migrations/021_app_global_performance_indexes.sql`
12. `backend/supabase/migrations/022_history_period_filters_indexes.sql`
13. `backend/supabase/migrations/023_produccion_500_pagos_urgencia.sql`
14. `deploy/pilot/supabase/10_AJUSTAR_AUDIENCIAS_COMUNIDAD.sql`
15. `deploy/pilot/supabase/11_PRELANZAMIENTO_ACTIVIDAD_ANALITICAS.sql`
16. `backend/supabase/migrations/031_active_plan_assignment_integrity.sql`
17. `backend/supabase/migrations/032_assigned_routine_persistence_guard.sql`
18. `backend/supabase/migrations/034_nutrition_exercise_launch_hardening.sql`
19. `backend/supabase/migrations/035_restore_body_metrics_history_and_session.sql`
20. `backend/supabase/migrations/036_simplified_experience_nutrition_safety.sql`
21. `backend/supabase/diagnostics/VERIFICAR_MIGRACION_034_v1.20.0.sql` (solo lectura)
22. `deploy/pilot/supabase/01_VERIFICAR_INSTALACION.sql`

## Base existente

No repetir scripts destructivos. En una base ya instalada, ejecutar únicamente las migraciones faltantes en orden. Para esta entrega, ejecutar:

```text
backend/supabase/migrations/031_active_plan_assignment_integrity.sql
backend/supabase/migrations/032_assigned_routine_persistence_guard.sql
backend/supabase/migrations/034_nutrition_exercise_launch_hardening.sql
backend/supabase/migrations/035_restore_body_metrics_history_and_session.sql
backend/supabase/migrations/036_simplified_experience_nutrition_safety.sql
```

Después del SQL, redesplegar Render y Vercel. Asigna dos rutinas consecutivas al mismo cliente y confirma que únicamente la más reciente permanezca activa y visible en “Mi plan”. Para revisar el caso de Stefanny sin modificar datos, ejecuta después:

```text
backend/supabase/diagnostics/verify_stefanny_assignment.sql
```

## Prohibido en producción

```text
python -m app.seed
```

Ese comando crea cuentas demo con contraseñas conocidas y ahora está bloqueado en `APP_ENV=production`.

## v1.20.0 — Lanzamiento seguro

Antes de la migración, guardar la salida de ambos diagnósticos en modo solo lectura. Después de ejecutar la migración 034, repetirlos y comparar conteos con:

```text
backend/supabase/diagnostics/VERIFICAR_MIGRACION_034_v1.20.0.sql
backend/supabase/diagnostics/VERIFICAR_RLS_Y_ROL_API_v1.20.0.sql
```

La migración 034 es aditiva: no elimina usuarios, contraseñas, tokens, planes ni ejercicios. No ejecutar una reversión destructiva del esquema; ante una incidencia, volver a desplegar v1.19.1 y conservar las columnas nuevas sin uso.


## v1.21.0 — Imperial Fitness Simple

Después de v1.20.x ejecutar obligatoriamente `035_restore_body_metrics_history_and_session.sql` (versión corregida sin índice COALESCE no-IMMUTABLE) y luego `036_simplified_experience_nutrition_safety.sql`. La migración 036 es aditiva y agrega la ficha de seguridad/preferencias alimentarias; no elimina usuarios, planes, contraseñas ni mediciones.

### Nota v1.21.0 — 027/028 v1.21.0 hardening
Para instalaciones limpias, las migraciones 027 y 028 ya crean `measured_at` y `recorded_at` con el mismo tipo de `created_at` y no crean el índice funcional `COALESCE` que podía provocar `ERROR 42P17`. En bases ya existentes no es necesario volver a ejecutar 027/028: aplicar 035 corregida y 036 según el orden de despliegue.
