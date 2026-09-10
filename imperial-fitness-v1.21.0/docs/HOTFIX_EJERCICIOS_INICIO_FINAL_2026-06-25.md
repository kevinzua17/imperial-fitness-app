# Hotfix: ejercicios con inicio y final visual

Fecha: 2026-06-25

## Objetivo

Aprovechar que `free-exercise-db` entrega múltiples imágenes por ejercicio para mostrar una vista más clara del rango del movimiento.

## Cambios

- Se conserva la traducción/normalización en español.
- Se leen todas las imágenes disponibles por ejercicio desde el campo `images`.
- Se usa la imagen `0.jpg` como fase **Inicio**.
- Se usa la imagen `1.jpg` como fase **Final** cuando existe.
- Se agrega una vista tipo GIF en tarjetas mediante transición entre inicio y final.
- En el modal técnico se muestran dos paneles: **Inicio → Final** con flecha central.
- Si solo existe una imagen, se mantiene la guía textual de rango.
- Se actualizó el caché de la base abierta a `imperial_open_exercise_db_v3_pair_range`.
- Se actualizó el service worker a `v6`.

## Archivos modificados

- `src/data/exerciseCatalog.ts`
- `src/data/exerciseMedia.ts`
- `src/services/openExerciseDbService.ts`
- `src/services/openExerciseDbService.test.ts`
- `src/components/ExerciseImage.tsx`
- `src/components/ExerciseLibraryView.tsx`
- `src/components/PersonalPlanView.tsx`
- `src/index.css`
- `public/service-worker.js`

## Validación

- Frontend typecheck: OK
- Frontend tests: 13 passed
- Frontend build: OK
- Backend tests: 39 passed
- Secret scan: OK
- Production readiness: OK

## Supabase

No se tocó Supabase.
No se ejecutó SQL.
No se cambiaron tablas, RLS ni datos.
