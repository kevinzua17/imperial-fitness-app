# Hotfix — Rutina semanal personalizada por grupos musculares

## Objetivo
Permitir que admin/entrenador diseñe la semana día por día y escoja uno o varios grupos musculares por día antes de generar la rutina.

## Cambios principales
- Nuevo modo: **Personalizar músculos por día**.
- El entrenador puede elegir grupos para lunes, martes, miércoles, jueves, viernes, sábado o domingo.
- Cada día puede tener varios grupos: pecho + tríceps, espalda + bíceps, pierna + glúteo, hombro + abdomen, etc.
- El generador usa únicamente ejercicios disponibles según el filtro activo: Todas, Imperial Fitness o Base abierta.
- Se conserva compatibilidad con el generador automático anterior.
- Se agregan guías de carga en las notas del ejercicio según objetivo y nivel:
  - Fuerza: cargas altas, descansos largos, RIR bajo.
  - Hipertrofia: volumen efectivo, 60-80% estimado, 1-3 RIR.
  - Resistencia: cargas moderadas/bajas, más repeticiones y descansos cortos.
  - Salud: esfuerzo moderado, rango seguro y técnica limpia.

## Archivos modificados
- `src/data/gymProgramming.ts`
- `src/components/PersonalPlanView.tsx`

## No se tocó
- Supabase
- SQL
- Tablas
- Políticas RLS
- Datos reales

## Validaciones
- Frontend typecheck OK
- Frontend tests OK: 14 passed
- Frontend build OK
- Backend tests OK: 39 passed
- Secret scan OK
- Production readiness OK
