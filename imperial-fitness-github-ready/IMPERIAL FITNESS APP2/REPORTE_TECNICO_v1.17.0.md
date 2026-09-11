# Informe técnico Imperial Fitness v1.17.0

## Incidente investigado

Algunos clientes, especialmente Stefanny, no visualizan la rutina aunque el entrenador recibe confirmación de publicación.

## Causa principal confirmada en el código

El botón de publicación de v1.16.0 verificaba la rutina con el token del administrador o entrenador. Esa consulta podía ser correcta mientras la solicitud real del cliente a `/routines/assigned/my-routine` era interceptada por `MembershipAccessMiddleware` y respondía HTTP 402 cuando la membresía estaba en `pending_validation`, `limited` o `suspended`.

Por tanto, el mensaje “visible desde la app del cliente” no demostraba la entrega al cliente. La fila podía estar activa en Supabase y ser legible para el entrenador, pero inaccesible para Stefanny.

## Segunda causa corregida

`payload_json` aceptaba como máximo 50.000 caracteres. Las rutinas extensas, con seis o siete días, imágenes, notas y metadatos, podían superar ese tamaño. Además, el sanitizador recortaba el texto antes de validar JSON, provocando errores 422 difíciles de interpretar.

La versión 1.17.0 eleva el límite de rutinas asignadas a 500.000 caracteres y rechaza claramente un exceso, sin truncar ni corromper el JSON.

## Correcciones aplicadas

1. Nuevo endpoint de diagnóstico integral:
   - `GET /routines/assigned/client-health/{client_id}`
   - Comprueba identidad exacta, duplicados de correo, estado del usuario, cantidad de rutinas activas, validez del contenido, días, ejercicios y bloqueo de membresía.
2. El Centro de publicación consulta ese endpoint antes de declarar que una rutina fue entregada.
3. Si la rutina se guardó pero la membresía bloquea el acceso, el panel lo informa expresamente y deja de mostrar un éxito falso.
4. Los errores reales de guardado se muestran al entrenador en lugar de una advertencia genérica.
5. Se agregó manejo específico de HTTP 402 en el frontend.
6. El límite de `payload_json` para rutinas asignadas subió de 50.000 a 500.000 caracteres.
7. Se actualizó la versión backend/Sentry/health a `1.17.0`.
8. `/health/ready` informa si existe el índice crítico `uq_assigned_routines_one_active_per_client`.
9. El login, creación y edición de usuarios normalizan el correo sin distinguir mayúsculas para prevenir nuevas cuentas duplicadas.
10. Se incrementó la caché PWA a `v13` para forzar la actualización del frontend instalado.
11. Se añadió el diagnóstico SQL `backend/supabase/diagnostics/diagnose_stefanny_delivery_v1.17.sql`.

## Riesgos adicionales detectados

- PostgreSQL permite correos diferentes solo por mayúsculas si la restricción es sensible a mayúsculas. Stefanny podría tener dos cuentas y la rutina estar vinculada a un ID distinto del usado al iniciar sesión.
- Las migraciones 031 y 032 son manuales. Render puede aparecer disponible aunque falte la protección de una única rutina activa.
- El estado de membresía es una regla comercial legítima, pero debe mostrarse como bloqueo de acceso y no como fallo de asignación.
- El frontend anterior ocultaba diferencias entre 402, 403, 409 y 422, haciendo el diagnóstico innecesariamente difícil.

## Qué no puede determinarse solo con el ZIP

El código no contiene los datos productivos de Supabase ni las variables/URLs reales de Render y Vercel. Para confirmar el caso exacto de Stefanny debe ejecutarse el SQL de diagnóstico en el proyecto Supabase que usa producción.
