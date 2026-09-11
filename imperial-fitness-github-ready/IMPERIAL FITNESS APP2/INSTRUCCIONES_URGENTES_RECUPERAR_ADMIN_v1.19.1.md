# Imperial Fitness v1.19.1 — Recuperación urgente del administrador

## Qué ocurrió probablemente

La versión 1.18.0 añadió nuevas columnas de acceso y membresía. El backend 1.19.0 consulta esas columnas al autenticar cualquier usuario. Si la migración 033 quedó incompleta, Render responde con error antes de validar el correo y la contraseña. También puede existir un bloqueo temporal después de varios intentos fallidos.

La biblioteca de rutinas de la versión 1.19.0 no modifica contraseñas, tokens, roles ni estados de usuario.

## Recuperación inmediata, sin volver a desplegar primero

1. Entra a Supabase.
2. Abre **SQL Editor**.
3. Ejecuta completo:

   `backend/supabase/diagnostics/RECUPERAR_ACCESO_ADMIN_v1.19.1.sql`

4. El resultado final debe mostrar al menos una cuenta con:
   - `role = admin`
   - `status = active`
   - `locked_until = null`

5. Ejecuta después:

   `backend/supabase/diagnostics/VERIFICAR_ACCESO_ADMIN_v1.19.1.sql`

6. Los tres primeros resultados deben indicar `OK`.

El rescate:

- completa la migración 033 de forma idempotente;
- elimina bloqueos temporales de cuentas administrativas;
- si no existe ningún administrador activo, reactiva únicamente la cuenta administrativa más antigua;
- no modifica clientes, rutinas, dietas, pagos ni archivos.

## Después del SQL

Prueba nuevamente el login. Si el navegador mantiene la versión anterior:

1. Cierra completamente la app.
2. Abre una ventana privada y prueba el acceso.
3. En Chrome de escritorio usa `Ctrl + Shift + R`.

## Desplegar la corrección permanente

### Render

Despliega primero el backend de la versión 1.19.1.

Comprueba:

- `/health` → `version: 1.19.1`
- `/health/ready` →
  - `database: connected`
  - `routine_single_active_guard: true`
  - `access_membership_dates_ready: true`
  - `admin_access_ready: true`
  - `status: ready`

### Vercel

Despliega después el frontend.

Confirma que la variable `VITE_API_BASE_URL` apunte a la URL HTTPS actual de Render, sin `/` final innecesario y sin `localhost`.

La caché PWA de esta versión es `imperial-fitness-shell-v16`.

## Mensajes de login corregidos

La pantalla ahora diferencia entre:

- correo o contraseña incorrectos;
- cuenta pendiente, suspendida o rechazada;
- bloqueo por intentos;
- actualización incompleta de Supabase;
- falta de conexión con Render.

Ya no presenta todos los problemas como si la cuenta estuviera pendiente.
