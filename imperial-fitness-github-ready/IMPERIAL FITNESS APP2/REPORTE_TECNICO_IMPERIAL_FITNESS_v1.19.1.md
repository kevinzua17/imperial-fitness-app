# Reporte técnico — Imperial Fitness v1.19.1

## Incidente

Después del despliegue de la versión 1.19.0, la cuenta administrativa dejó de poder iniciar sesión.

## Análisis comparativo

La diferencia 1.18.0 → 1.19.0 no alteró las rutas de autenticación. Los cambios de 1.19.0 se limitaron principalmente a:

- biblioteca fija de rutinas;
- metadatos de rutinas;
- interfaz de asignación;
- versión de la API y caché PWA.

La diferencia 1.17.0 → 1.18.0 sí añadió columnas ORM en `users` y `membership_accounts`. PostgreSQL no agrega esas columnas automáticamente porque `DB_AUTO_CREATE` está desactivado en producción. Si la migración 033 no se ejecuta por completo, una consulta ORM de `User` puede fallar antes de terminar el login.

La pantalla anterior capturaba cualquier error y mostraba siempre un texto de cuenta pendiente, ocultando la diferencia entre HTTP 401, 403, 429, 500/503 y una falla de red.

## Correcciones

1. Script idempotente de recuperación administrativa.
2. Verificación de las 11 columnas y los dos triggers de la migración 033.
3. Limpieza de `failed_login_attempts` y `locked_until` para administradores.
4. Reactivación controlada de una única cuenta solamente cuando no existe ningún admin activo.
5. Manejo explícito de error de esquema en `/auth/login`, `/auth/refresh` y autenticación por token.
6. Mensajes diferenciados en la pantalla de acceso.
7. Nueva bandera `admin_access_ready` en `/health/ready`.
8. Restauración de archivos `.env.*.example` omitidos en el paquete 1.19.0.
9. Caché PWA actualizada a v16.

## Elementos no modificados

- Contraseñas guardadas.
- Hashes de contraseña.
- Rutinas asignadas.
- Dietas.
- Pagos y comprobantes.
- Archivos de Cloudinary.
- Clientes y sus membresías.
- Plantillas maestras de hipertrofia 1.19.0.

## Validación realizada

- Compilación sintáctica de Python: OK.
- Transpilación sintáctica de 94 archivos TypeScript/TSX: OK.
- JSON de paquete y despliegue: OK.
- Escaneo de secretos: OK.
- Production readiness check: OK.

No se ejecutó la suite completa de npm contra todas las dependencias porque el registro de paquetes no completó la instalación en el entorno de revisión. La validación sintáctica se realizó con el compilador TypeScript disponible en el entorno.
