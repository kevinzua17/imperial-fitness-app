# Despliegue seguro Imperial Fitness v1.17.0

## 1. Diagnosticar a Stefanny antes de cambiar datos

En Supabase SQL Editor ejecute:

`backend/supabase/diagnostics/diagnose_stefanny_delivery_v1.17.sql`

Guarde el resultado. La columna `diagnosis` indicará si el bloqueo proviene de membresía, cuenta duplicada, usuario inactivo, rutina ausente, JSON inválido o rutina incompleta.

## 2. Confirmar migraciones existentes

Ejecute, en este orden, si todavía no están aplicadas:

1. `backend/supabase/migrations/031_active_plan_assignment_integrity.sql`
2. `backend/supabase/migrations/032_assigned_routine_persistence_guard.sql`

No hay una migración nueva para ampliar el tamaño: `payload_json` ya es `TEXT` en PostgreSQL.

## 3. Publicar backend en Render

- Suba el código v1.17.0 al repositorio conectado.
- Confirme que Render despliegue el commit correcto.
- Abra `/health` y compruebe `"version": "1.17.0"`.
- Abra `/health/ready` y confirme:
  - `database: connected`
  - `routine_single_active_guard: true`

Si la versión sigue siendo anterior, Render no está usando este código.

## 4. Publicar frontend en Vercel

- Despliegue el mismo commit v1.17.0.
- Confirme que `VITE_API_BASE_URL` apunta al backend Render correcto.
- En el dispositivo de Stefanny cierre completamente la PWA/navegador, vuelva a abrir y recargue. La caché cambió a `v13`.

## 5. Verificar desde el panel

1. Abra a Stefanny usando su correo exacto y confirme el ID mostrado por el diagnóstico.
2. Pulse `Guardar y enviar rutina`.
3. El panel ahora debe mostrar una de estas respuestas:
   - entrega verificada;
   - rutina guardada, pero membresía bloqueada;
   - cuenta duplicada;
   - rutina incompleta/JSON inválido;
   - otro error real del servidor.

## 6. Resolver según el diagnóstico

- `pending_validation`: revisar/aprobar o rechazar el pago pendiente desde Membresías.
- `limited` o `suspended`: regularizar la membresía o registrar el pago manual desde el panel; no modificar el estado directamente en SQL salvo que exista una decisión administrativa documentada.
- cuenta duplicada: identificar con cuál correo/ID inicia sesión Stefanny y consolidar datos antes de borrar nada.
- usuario inactivo: activar la cuenta correcta desde administración.
- rutina sin días/ejercicios: regenerar o completar y volver a publicar.
- más de una rutina activa o índice faltante: aplicar migraciones 031 y 032.

## 7. Prueba final

La prueba válida es iniciar sesión como Stefanny y abrir `Plan personal`. Verificar solo desde el token del administrador ya no se considera evidencia suficiente.
