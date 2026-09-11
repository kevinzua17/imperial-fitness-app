# Imperial Fitness v1.21.1 Simple Staff — Actualización segura

## Si tu base de Supabase YA está en uso

**No vuelvas a ejecutar las migraciones 027 ni 028.** Esas migraciones fueron endurecidas en el repositorio para que una instalación limpia futura nazca correctamente, pero una base existente no necesita repetirlas.

### Orden recomendado

1. Haz backup/snapshot de la base de datos y conserva una copia del proyecto v1.20.x.
2. En Supabase SQL Editor ejecuta `MIGRACION_035_RESTAURAR_HISTORIAL_Y_SESION_v1.20.1.sql` (la versión corregida incluida en este paquete).
3. Revisa el resumen final: idealmente `medidas_sin_fecha_real = 0`, `medidas_sin_fecha_registro = 0` y `tmb_sin_fuente = 0` cuando los datos existentes permitan completarlos.
4. Ejecuta `MIGRACION_036_SEGURIDAD_NUTRICIONAL_Y_EXPERIENCIA_SIMPLE_v1.21.1.sql`.
5. Despliega el backend v1.21.1.
6. Despliega el frontend v1.21.1.
7. Ejecuta en CI o en un equipo con acceso al registro npm:

```bash
npm ci
npm run typecheck
npm run test
npm run build
```

8. Smoke test mínimo:
   - login cliente;
   - navegación: Hoy → Mi plan → Progreso → Mi coach → Perfil;
   - abrir rutina publicada;
   - registrar una serie;
   - revisar sugerencia de progresión;
   - abrir alimentación publicada;
   - descargar PDF;
   - login coach/admin y revisar un cliente;
   - revisar ficha de seguridad nutricional;
   - publicar un plan de prueba;
   - confirmar que el cliente recibe la versión publicada.

## Si instalas una base DESDE CERO

Ejecuta el esquema y las migraciones en el orden documentado en `backend/supabase/DEPLOY_ORDER.md`. En v1.21.1 las migraciones 027/028 ya fueron corregidas para crear las columnas temporales con el mismo tipo que `created_at` y no crear el índice funcional que causaba `ERROR 42P17`.

## Regla de salida a producción

No etiquetar la versión como release de producción hasta que CI marque verde en `typecheck`, `test` y `build`. El código incluido pasó las validaciones estáticas disponibles en el entorno de preparación, pero dicho entorno no puede resolver `registry.npmjs.org` y por eso no puede reconstruir aquí el árbol npm completo.
