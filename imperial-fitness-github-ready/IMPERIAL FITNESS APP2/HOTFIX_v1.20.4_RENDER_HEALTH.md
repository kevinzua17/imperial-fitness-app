# Imperial Fitness v1.20.4 — estabilidad de Render

## Causa corregida
Render usaba `/health/ready` como health check. Esa ruta consulta Redis y ejecuta múltiples consultas de diagnóstico en Supabase. Render exige una respuesta HTTP 2xx/3xx en menos de cinco segundos, por lo que una demora de red podía marcar la instancia como fallida y provocar indisponibilidad intermitente del login y del módulo nutricional.

## Cambios
- `render.yaml`: health check cambiado a `/health/live`.
- `/health/ready` se conserva para diagnóstico manual de dependencias.
- Redis ahora tiene timeout de conexión y lectura de 1 segundo.
- Las rutas `/health*` no pasan por el rate limiter.
- No hay cambios de esquema, usuarios, contraseñas ni datos.

## Despliegue
1. Subir el código a GitHub.
2. Desplegar Render primero.
3. Confirmar que `/health/live` responde `{"status":"alive"}`.
4. Confirmar que la instancia permanece `Live`.
5. No ejecutar SQL para este hotfix.
