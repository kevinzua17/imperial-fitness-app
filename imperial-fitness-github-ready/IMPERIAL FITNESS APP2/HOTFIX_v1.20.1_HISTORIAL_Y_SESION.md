# Imperial Fitness v1.20.1 — Historial y sesión persistente

## Problemas corregidos

1. Al recargar la página, la app ya no revoca la sesión por un timeout, un error 503 o una caída temporal de red.
2. El frontend usa `/api` mediante Vercel como proxy de primera parte, evitando que navegadores bloqueen la cookie de renovación entre Vercel y Render.
3. La cookie de renovación ahora utiliza `Path=/` y limpia la cookie antigua con `Path=/auth`.
4. La pestaña o módulo actual se conserva en la URL y en almacenamiento local.
5. Administradores y entrenadores ya no consultan por error el historial del usuario administrador mientras se carga la lista de clientes.
6. El cliente seleccionado en el módulo de medidas queda guardado.
7. La migración 035 completa columnas de fechas faltantes sin borrar ni reemplazar mediciones existentes.

## Despliegue

1. Ejecutar `VERIFICAR_HISTORIAL_MEDIDAS_v1.20.1.sql` en Supabase.
2. Si `columnas_historial_encontradas` es menor que 3 o el endpoint no carga, ejecutar `MIGRACION_035_RESTAURAR_HISTORIAL_Y_SESION_v1.20.1.sql`.
3. Desplegar Render.
4. Desplegar Vercel.
5. En Vercel configurar `VITE_USE_SAME_ORIGIN_API=true`.
6. Iniciar sesión una sola vez para que la nueva cookie reemplace la antigua.
7. Entrar a un módulo, recargar y verificar que permanezca allí.

## Seguridad

La migración no contiene `delete`, `drop`, `truncate` ni modificaciones de `password_hash`.
