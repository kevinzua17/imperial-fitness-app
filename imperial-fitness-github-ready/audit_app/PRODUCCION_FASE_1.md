# Imperial Fitness - Fase 1 Produccion minima

Dominio objetivo:

```text
imperialfitnesgym.com.co
```

## 1. Frontend en Vercel

Variables en Vercel:

```env
VITE_API_BASE_URL=https://TU-BACKEND-RENDER.onrender.com
```

Dominio en Vercel:

```text
imperialfitnesgym.com.co
www.imperialfitnesgym.com.co
```

Config DNS sugerida:

```text
A     @      76.76.21.21
CNAME www    cname.vercel-dns.com
```

## 2. Backend en Render

Usa `render.yaml`.

Variables obligatorias en Render:

```env
DATABASE_URL=postgresql://...
SECRET_KEY=clave-larga-segura
CORS_ORIGINS=https://imperialfitnesgym.com.co,https://www.imperialfitnesgym.com.co
STORAGE_MODE=cloudinary
CLOUDINARY_URL=cloudinary://...
AI_MODE=local_rules
```

## 3. Base de datos Supabase

1. Crear proyecto Supabase.
2. Copiar connection string de PostgreSQL.
3. Pegarla como `DATABASE_URL` en Render.
4. Ejecutar migraciones/RLS cuando se consolide producción.

## 4. Imagenes

Para produccion usar Cloudinary:

```env
STORAGE_MODE=cloudinary
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

En local puede quedarse:

```env
STORAGE_MODE=local
```

## 5. PWA instalable

La PWA ya tiene:

- `public/manifest.webmanifest`
- `public/service-worker.js`
- iconos apuntando a `public/logo-imperial-fitness.png`

Para que funcione bien:

1. Coloca el logo real en `public/logo-imperial-fitness.png`.
2. Sube frontend a Vercel.
3. Abre la web en Android/Chrome o iPhone/Safari.
4. Usa "Agregar a pantalla de inicio".

## 6. Prueba con 5 clientes

Checklist:

- Crear usuarios reales.
- Aprobarlos en Accesos.
- Cargar una dieta simple.
- Cargar una rutina simple.
- Registrar peso.
- Registrar series.
- Subir foto de progreso.
- Publicar en comunidad.
- Probar instalación PWA.