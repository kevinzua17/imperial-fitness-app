# Imperial Fitness v1.18.0 — Fechas administrativas e interfaz compacta

## Objetivo

Esta versión permite revisar y corregir fechas de acceso y membresía sin mezclar ambos controles. También reduce el desplazamiento vertical mediante un menú de módulos desplegable y paneles que se abren solo cuando se necesitan.

## Cambios funcionales

### 1. Acceso de la cuenta

En **Accesos → Usuarios** el administrador puede revisar y modificar:

- estado de la cuenta: pendiente, activa, suspendida o rechazada;
- fecha desde la que quedó pendiente;
- fecha de activación;
- fecha de suspensión;
- fecha del último cambio de estado;
- nota administrativa.

Este control determina si el usuario puede iniciar sesión. No cambia automáticamente el vencimiento de la membresía.

### 2. Membresía y módulos premium

En **Membresías** cada cliente aparece resumido en una fila desplegable. Al abrirla se pueden revisar o modificar:

- inicio y fin de prueba;
- último pago;
- próximo vencimiento;
- fecha de activación de la membresía;
- fecha de entrada a validación pendiente;
- fecha de suspensión;
- último cambio de estado;
- nota administrativa.

El estado puede permanecer en modo **Automático según fechas y pagos**, que es el recomendado. También puede aplicarse un estado manual temporal con fecha de finalización. Al vencer esa fecha, el backend elimina el control manual y vuelve al cálculo automático.

### 3. Interfaz compacta

- La barra superior sigue fija, pero los módulos ahora se muestran en un selector desplegable.
- El menú se cierra al elegir un módulo, al hacer clic fuera o al presionar Escape.
- Membresías, comprobantes, configuración y clientes se organizan en paneles desplegables.
- Camino Imperial se separa en resumen, hábitos, entrenador de fuerza e insignias.
- En la vista del cliente, pago e historial de membresía permanecen cerrados hasta que se necesiten; el pago se abre automáticamente si el acceso está restringido.
- En Accesos, fechas y contraseña permanecen cerradas por usuario.

## Seguridad aplicada

- Solo administradores pueden modificar fechas de acceso o membresía.
- El administrador no puede suspender ni desactivar su propia cuenta.
- Los campos aceptados por el endpoint de membresía están en una lista cerrada.
- Las fechas obligatorias se validan antes de guardar.
- No se permite un fin de prueba anterior al inicio.
- Los cambios requieren confirmación en el frontend.
- Las mutaciones quedan registradas por el middleware de auditoría HTTP existente.
- La migración es idempotente y no elimina usuarios, rutinas, dietas ni pagos.

## Base de datos

La versión agrega la migración:

`backend/supabase/migrations/033_access_membership_dates_and_manual_control.sql`

También incluye la verificación de solo lectura:

`backend/supabase/diagnostics/verify_v1.18_access_membership_dates.sql`

## Compatibilidad

La migración 033 debe ejecutarse **antes de desplegar el backend v1.18.0**, porque el modelo de usuario y las consultas de membresía ya esperan las nuevas columnas.

## Protecciones adicionales de consistencia

- Si una cuenta queda en estado pendiente, activo o suspendido, el backend garantiza que exista la fecha principal correspondiente.
- Si una membresía queda activa/próxima a vencer, pendiente de validación o suspendida, el backend completa la fecha principal cuando accidentalmente se envía vacía.
- `/health/ready` valida tanto las once columnas nuevas como los dos triggers de sincronización; no considera lista la migración cuando solo existen las columnas.
