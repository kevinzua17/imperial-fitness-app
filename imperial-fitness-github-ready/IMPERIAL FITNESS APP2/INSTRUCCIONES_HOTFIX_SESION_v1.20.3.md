# Imperial Fitness v1.20.3 — sesión estable al refrescar

## Qué corrige

- El access token se conserva en `sessionStorage`, no en `localStorage`.
- Al presionar F5 o recargar la página, la app restaura la sesión antes de mostrar el login.
- Se conserva el módulo mediante el parámetro `?tab=` y `imperial_last_active_tab`.
- El cierre de sesión elimina el token de la pestaña.
- No se almacenan contraseñas.
- No requiere ejecutar SQL ni modificar Supabase.

## Despliegue

1. Subir esta versión a GitHub.
2. Desplegar Vercel sin caché.
3. No es necesario cambiar Render para este hotfix.
4. Iniciar sesión una sola vez después del despliegue.
5. Entrar a un módulo distinto de Dashboard y presionar F5. Debe permanecer en ese módulo.

## Variable de Vercel

Mantener la configuración que recuperó el login:

```text
VITE_USE_SAME_ORIGIN_API=false
```

`VITE_API_BASE_URL` debe conservar la URL de Render que ya estaba funcionando.
