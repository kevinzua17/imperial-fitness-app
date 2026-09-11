# Orden de despliegue — Hotfix v1.20.1

## 1. Supabase

1. Crear o confirmar un backup.
2. Ejecutar `VERIFICAR_HISTORIAL_MEDIDAS_v1.20.1.sql`.
3. Guardar `medidas_totales` y `usuarios_con_medidas`.
4. Ejecutar `MIGRACION_035_RESTAURAR_HISTORIAL_Y_SESION_v1.20.1.sql`.
5. Repetir la verificación. `columnas_historial_encontradas` debe ser 3 y `medidas_huerfanas` debe ser 0.

## 2. Render

Desplegar el backend v1.20.1 y comprobar:

`https://imperial-fitness-api.onrender.com/health/ready`

Debe incluir:

- `version: 1.20.1`
- `body_metrics_history_ready: true`
- `status: ready`

## 3. Vercel

1. Subir el código v1.20.1.
2. Configurar `VITE_USE_SAME_ORIGIN_API=true`.
3. Mantener `VITE_API_BASE_URL=https://imperial-fitness-api.onrender.com` como respaldo para builds no web.
4. Desplegar producción.

## 4. Prueba

1. Iniciar sesión una vez después del despliegue para sustituir la cookie antigua.
2. Entrar a `Mis medidas` o cualquier otro módulo.
3. Recargar con F5 o desde el teléfono.
4. La app debe restaurar la sesión y permanecer en el mismo módulo.
5. Para admin/entrenador, seleccionar un cliente y confirmar que su historial aparece y queda seleccionado al volver.
