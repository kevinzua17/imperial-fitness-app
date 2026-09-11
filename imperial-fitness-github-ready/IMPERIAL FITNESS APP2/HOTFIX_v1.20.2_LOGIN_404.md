# Imperial Fitness v1.20.2 — corrección del login 404

## Causa
La versión 1.20.1 activaba `/api` por defecto y `vercel.json` enviaba esa ruta a una URL de Render fija. Cuando el backend real tenía otra URL, `/api/auth/login` respondía 404.

## Corrección
- `VITE_USE_SAME_ORIGIN_API` vuelve a ser opt-in.
- Por defecto se usa `VITE_API_BASE_URL`, como en v1.20.0.
- Se elimina el rewrite de Render escrito de forma fija.
- Se conservan las mejoras de restauración de sesión y del historial corporal de v1.20.1.

## Vercel
Configurar:

```text
VITE_USE_SAME_ORIGIN_API=false
VITE_API_BASE_URL=https://URL-REAL-DE-TU-BACKEND.onrender.com
```

Después, redesplegar Vercel sin caché. No requiere una nueva migración de Supabase.
