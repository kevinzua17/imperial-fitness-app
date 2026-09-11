# Plan de piloto de producción - Imperial Fitness

## Qué quedó preparado

Se agregó una carpeta completa de despliegue piloto en:

```txt
deploy/pilot/
```

Incluye:

- Variables de entorno para backend en Render/Railway.
- Variables de entorno para frontend en Vercel/Netlify.
- SQL único para Supabase.
- Guías paso a paso para Supabase, Cloudinary, Redis, SMTP, Render, Vercel y APK Android.
- Checklist de prueba con 10 a 20 usuarios.
- Scripts Windows para generar secret key, validar backend, validar build y preparar APK.

## Flujo recomendado

### Día 1: infraestructura base

1. Crear Supabase.
2. Ejecutar `deploy/pilot/supabase/00_RUN_ALL_IN_SUPABASE.sql`.
3. Crear Cloudinary.
4. Crear Redis en Upstash.
5. Crear SMTP en Brevo o Gmail App Password.

### Día 2: publicación web

1. Desplegar backend en Render/Railway.
2. Colocar variables desde `deploy/pilot/render.env.example`.
3. Probar `/health`.
4. Desplegar frontend en Vercel/Netlify.
5. Colocar `VITE_API_BASE_URL` desde `deploy/pilot/vercel.env.example`.
6. Probar desde celular.

### Día 3: APK Android

1. Generar build.
2. Sincronizar Capacitor.
3. Abrir Android Studio.
4. Generar APK.
5. Instalarlo en celulares de prueba.

### Días 4 a 10: piloto real

1. Crear usuarios reales.
2. Probar roles.
3. Cargar rutinas y dietas.
4. Registrar progreso.
5. Subir fotos.
6. Registrar errores.

## Decisión después del piloto

Si el piloto funciona 7 días sin errores críticos, se puede pasar a 50-100 usuarios. Después de esa segunda validación, se recomienda pasar a infraestructura paga antes de abrir a 500 usuarios.

## Proyecto Supabase del piloto

Se registró esta URL pública del proyecto:

```env
SUPABASE_URL=https://vaaeaqdbocfnfasiznyl.supabase.co
```

No se incluye `DATABASE_URL`, contraseña de base de datos ni `service_role_key` dentro del ZIP. Esas credenciales se configuran después como variables privadas en Render/Railway.
