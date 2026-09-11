# Imperial Fitness v1.20.1

## Correcciones críticas

- Restauración automática de sesión al recargar la página.
- Los errores temporales de red, 408, 429 o 5xx ya no ejecutan cierre de sesión.
- Proxy `/api` en Vercel para que la cookie HttpOnly sea de primera parte.
- Cookie de renovación migrada de `Path=/auth` a `Path=/`, limpiando ambas rutas al cerrar sesión.
- Persistencia del módulo activo mediante URL y almacenamiento local.
- Persistencia del cliente seleccionado en Seguimiento corporal.
- Administradores y entrenadores ya no consultan accidentalmente sus propias medidas mientras carga la lista de clientes.
- Lectura del historial sin caché de frontend.
- Migración 035 aditiva para asegurar `measured_at`, `recorded_at` y `bmr_source` sin eliminar registros.
- Readiness de Render comprueba el esquema requerido para el historial corporal.
- Cachés PWA incrementadas para retirar el frontend anterior.

## Seguridad

No se modifican algoritmos de contraseña, `password_hash`, correos, roles, `token_version` ni cuentas existentes. La migración 035 no contiene operaciones destructivas.
