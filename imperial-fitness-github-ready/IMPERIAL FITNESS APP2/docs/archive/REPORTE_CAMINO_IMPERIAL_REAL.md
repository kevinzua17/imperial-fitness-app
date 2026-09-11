# Reporte de modificación — Camino Imperial real

## Qué se modificó

Se reemplazó el módulo visual de gamificación por una versión funcional conectada al backend/Supabase:

- Se eliminó el fallback local del servicio `gamificationService.ts`; ya no se crean datos falsos con `localStorage` cuando falla la API.
- Se agregó sistema de hábitos editables desde UI.
- Se agregó seguimiento diario y semanal de hábitos con porcentaje real de cumplimiento.
- Se agregó cálculo de Nivel Imperial basado en eventos XP reales guardados en `xp_events`.
- Se agregaron rachas reales por hábitos, entrenamiento, nutrición, agua, sueño, progreso y fuerza.
- Se agregó progresión automática de cargas tipo entrenador.
- Se agregaron metas de fuerza editables por usuario: sentadilla, press banca, peso muerto o cualquier ejercicio nuevo.
- Se agregaron logs de carga con sugerencia automática: subir peso, mantener o descargar según reps y RIR.

## Archivos principales modificados

- `src/components/GamificationPanel.tsx`
- `src/services/gamificationService.ts`
- `backend/app/routers/gamification.py`
- `backend/app/services/gamification_engine.py`
- `backend/supabase/schema.sql`
- `backend/supabase/DEPLOY_ORDER.md`
- `.env.example`
- `.env.pilot.example`
- `.env.production.example`

## Archivo nuevo

- `backend/supabase/migrations/019_camino_imperial_real.sql`

## Tablas Supabase agregadas o estabilizadas

- `user_gamification_status`
- `user_streaks`
- `user_badges`
- `xp_events`
- `gamification_notifications`
- `user_mission_logs`
- `user_habits`
- `habit_completions`
- `strength_goals`
- `strength_goal_logs`

## Orden de instalación en Supabase

Ejecutar primero el esquema base si la base está limpia:

```sql
backend/supabase/schema.sql
```

Luego ejecutar las migraciones en el orden indicado en:

```txt
backend/supabase/DEPLOY_ORDER.md
```

La nueva migración clave es:

```txt
backend/supabase/migrations/019_camino_imperial_real.sql
```

## Variables de entorno necesarias

El frontend debe apuntar al backend real:

```env
VITE_API_BASE_URL=https://TU-BACKEND.com
VITE_DEV_MODE=false
```

El backend debe apuntar a Supabase PostgreSQL con `DATABASE_URL` real:

```env
DATABASE_URL=postgresql+psycopg://USUARIO:CLAVE@HOST:PUERTO/postgres
```

No se dejaron mocks en el servicio de Camino Imperial. Si Supabase o el backend no responden, la pantalla muestra error en vez de inventar progreso local.

## Validación realizada

- Se validó la sintaxis Python del backend con `compileall`.
- No se pudo ejecutar `npm run build` dentro del contenedor porque las dependencias Node del ZIP venían incompletas y `npm ci` no terminó dentro del límite disponible. El código TypeScript fue revisado y preparado para compilar en el entorno normal del proyecto ejecutando `npm install` y `npm run build`.
