# Rollback seguro — Imperial Fitness v1.20.0

## Objetivo

Retirar el código v1.20.0 sin borrar usuarios, contraseñas, dietas históricas o ejercicios. La migración 034 es aditiva; por defecto, sus columnas deben permanecer aunque se revierta el código.

## Cuándo activar rollback

- Login o refresh falla para cuentas existentes.
- `/health/ready` está degradado después de revisar variables y migración.
- Aparecen errores 500 sostenidos, saturación de conexiones o corrupción de planes.
- El frontend no completa el build o no puede comunicarse con el backend.
- Se detecta exposición de secretos o acceso indebido.

## Procedimiento

1. Detener la apertura de nuevos usuarios y comunicar mantenimiento.
2. Guardar logs, request IDs y métricas del incidente.
3. Revertir Vercel al deployment estable de v1.19.1.
4. Revertir Render al deployment estable de v1.19.1.
5. Mantener las columnas agregadas por la migración 034. El código anterior las ignorará.
6. Ejecutar el diagnóstico SQL de solo lectura y comparar:
   - total de usuarios;
   - hashes nulos/sospechosos;
   - planes activos duplicados;
   - estado de la base.
7. Probar login, refresh, dashboard, dieta y rutina con cuentas internas.
8. Mantener el servicio en v1.19.1 mientras se corrige la causa en una rama aislada.

## Acciones prohibidas durante el rollback normal

- No eliminar columnas de la migración 034.
- No restaurar toda la base solo para revertir código.
- No modificar `password_hash`, `token_version`, refresh tokens, correos o roles.
- No ejecutar scripts de recuperación de administrador salvo que el incidente sea específicamente de acceso administrativo y exista autorización.
- No borrar borradores o versiones de dieta para “limpiar” el sistema.
- No eliminar originales de Cloudinary durante un rollback de código.

## Restauración de base

Una restauración completa de Supabase es el último recurso y solo corresponde ante corrupción confirmada. Debe hacerse en una instancia o proyecto de recuperación, comparar datos y planificar el corte. Restaurar una copia antigua puede perder registros creados después del backup.

## Criterio de recuperación

El servicio puede reabrirse cuando:

- las cuentas existentes inician sesión;
- el total de usuarios y hashes de seguridad es consistente;
- existe máximo un plan publicado activo por cliente;
- las rutas principales responden sin errores sostenidos;
- el incidente tiene causa y corrección documentadas.
