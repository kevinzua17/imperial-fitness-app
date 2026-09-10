# Hotfix: generador de rutinas con fuente de ejercicios y nombres en español

Fecha: 2026-06-25

## Objetivo

Permitir que el generador de rutinas use el catálogo visual disponible según la fuente elegida por el entrenador/admin:

- Todas
- Imperial Fitness
- Base abierta

La corrección conserva las estructuras anteriores del generador: objetivo, nivel, división, días, técnicas de intensidad, limitaciones activas, reemplazos selectivos y guardado de rutina asignada.

## Cambios aplicados

- `PersonalPlanView.tsx`: selector de fuente dentro del generador de rutinas.
- `gymProgramming.ts`: el generador acepta catálogo dinámico y filtro de fuente.
- `openExerciseDbService.ts`: nombres abiertos convertidos a español para evitar ejercicios visibles en inglés.
- `service-worker.js`: versión de caché PWA actualizada a v7.

## Seguridad de datos

No se tocó Supabase.
No se ejecutó SQL.
No se cambiaron tablas ni políticas RLS.
No se guardaron los ejercicios abiertos en base de datos.

## Comportamiento esperado

- Si eliges **Todas**, genera mezclando Imperial Fitness + base abierta disponible.
- Si eliges **Imperial Fitness**, solo usa ejercicios propios/locales/API del gimnasio.
- Si eliges **Base abierta**, solo usa ejercicios cargados desde `free-exercise-db`.
- Los nombres se muestran en español; la descripción y guía técnica siguen en español.
