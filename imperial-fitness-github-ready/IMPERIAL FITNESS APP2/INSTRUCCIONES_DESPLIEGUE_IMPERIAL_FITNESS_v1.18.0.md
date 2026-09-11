# Despliegue seguro Imperial Fitness v1.18.0

## 1. Respaldo

Antes del cambio, confirma que Supabase tenga un respaldo o punto de restauración reciente.

## 2. Supabase — ejecutar primero

En **Supabase → SQL Editor**, ejecuta únicamente:

`backend/supabase/migrations/033_access_membership_dates_and_manual_control.sql`

La migración es idempotente. Agrega columnas, completa fechas faltantes y crea triggers de sincronización. No borra planes, usuarios, rutinas ni pagos.

Después ejecuta:

`backend/supabase/diagnostics/verify_v1.18_access_membership_dates.sql`

Los dos primeros resultados deben indicar `OK`. Las dos consultas de inconsistencias deben devolver cero filas.

No ejecutes nuevamente `schema.sql`, `00_RUN_ALL_IN_SUPABASE.sql` ni seed de demostración sobre producción.

## 3. Render — backend

Despliega el contenido de v1.18.0 y revisa:

- `/health` → `version: 1.18.0`
- `/health/ready` →
  - `database: connected`
  - `routine_single_active_guard: true`
  - `access_membership_dates_ready: true`
  - `status: ready`

Si `access_membership_dates_ready` aparece como `false`, no publiques el frontend todavía; vuelve a ejecutar la migración 033 y su verificación.

## 4. Vercel — frontend

Después de confirmar Render, despliega el frontend. El service worker usa el caché `imperial-fitness-shell-v14`, por lo que la versión anterior debe renovarse. En dispositivos que mantengan una pestaña antigua, cierra y vuelve a abrir la aplicación o usa “Actualizar plan”.

## 5. Prueba administrativa

1. Abre **Accesos** y selecciona un usuario de prueba.
2. Abre **Fechas y estado de acceso**.
3. Cambia una nota o fecha no crítica y guarda.
4. Abre **Membresías**.
5. Filtra al mismo usuario y abre su fila.
6. Confirma que el modo sea **Automático según fechas y pagos**.
7. Modifica una fecha de prueba y guarda.
8. Inicia sesión como ese cliente y confirma que sus módulos y rutina sigan disponibles según el estado esperado.

## Diferencia importante

- **Accesos** controla el inicio de sesión.
- **Membresías** controla rutinas, alimentación, Camino Imperial y demás módulos premium.

No uses un estado manual permanente salvo que exista una razón administrativa clara. Para una excepción temporal, elige el estado y define “Estado manual hasta”.
