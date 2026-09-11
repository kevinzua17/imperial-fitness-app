# Informe de ajuste: fecha real de medición InBody

## Problema corregido
La app registraba las mediciones corporales con la fecha del día en que se digitaban. Esto afectaba gráficas, historial y retos cuando una medición InBody tomada en una fecha anterior se cargaba días después.

## Solución aplicada
Se agregó la posibilidad de elegir la fecha real de medición al registrar o editar medidas corporales.

La app ahora maneja dos fechas:

- **Fecha real de medición:** día en que el cliente se tomó la medición en InBody o báscula.
- **Fecha de digitación:** día en que el dato se cargó en la app.

## Impacto en la experiencia
- La gráfica corporal usa la fecha real de toma.
- El historial muestra la fecha real y, si fue cargada después, muestra también la fecha de digitación.
- Se pueden editar mediciones históricas para corregir fecha o valores.
- Si se registra una medición antigua, no reemplaza la métrica actual si ya existe una medición más reciente.

## Impacto en retos
Las métricas del reto usan la fecha real de toma. Además, si una medición fue digitada varios días después, el panel del reto puede marcarla como señal de revisión para evitar reclamos o trampas en la garantía.

## SQL requerido
Ejecutar en Supabase:

`backend/supabase/migrations/027_inbody_fecha_real_medicion.sql`

## Archivos modificados
- `backend/app/models.py`
- `backend/app/schemas.py`
- `backend/app/routers/progress.py`
- `backend/app/routers/challenges.py`
- `backend/app/routers/finance.py`
- `src/services/progressService.ts`
- `src/components/ProgressAnalyticsView.tsx`
- `backend/supabase/migrations/027_inbody_fecha_real_medicion.sql`
