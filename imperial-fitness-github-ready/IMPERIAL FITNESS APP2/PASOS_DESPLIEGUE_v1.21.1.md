# Imperial Fitness v1.21.1 Simple Staff — despliegue y verificación

## 1. Base de datos
Si 035 y 036 ya fueron aplicadas correctamente, NO volver a ejecutarlas. v1.21.1 no requiere una migración adicional.

## 2. GitHub
Reemplazar el código del proyecto por el contenido de `Imperial-Fitness-v1.21.1-Simple-Staff` y hacer commit/push a la rama que Vercel y Render usan en producción.

Verificar en GitHub que `package.json` contiene:

```json
"version": "1.21.1"
```

## 3. Render
Desplegar el último commit.
No eliminar las variables existentes de Supabase, Redis, SMTP ni Cloudinary.

Comprobar:

- `https://imperial-fitness-api.onrender.com/health`
- `https://imperial-fitness-api.onrender.com/health/live`
- `https://imperial-fitness-api.onrender.com/health/ready`

`/health/live` debe responder aproximadamente:

```json
{"status":"alive","version":"1.21.1"}
```

Si responde otra versión, Render está sirviendo otro commit/build.

## 4. Vercel
Confirmar que Production Branch sea la rama donde se subió v1.21.1 y que Root Directory apunte a la carpeta que contiene `package.json`, `src`, `vite.config.ts` y `vercel.json`.

Mantener:

```env
VITE_API_BASE_URL=https://imperial-fitness-api.onrender.com
VITE_USE_SAME_ORIGIN_API=false
VITE_DEV_MODE=false
```

Hacer un Redeploy del último commit. Si existe duda de caché, redeploy sin reutilizar Build Cache.

## 5. Verificación visual
Después del despliegue, en la cabecera debe leerse:

`Fitness Club · v1.21.1`

Menú cliente:
- Hoy
- Mi plan
- Progreso
- Mi coach
- Perfil

Menú entrenador:
- Inicio
- Clientes
- Planes
- Herramientas coach
- Perfil

Menú administrador:
- Inicio
- Clientes
- Planes
- Centro de gestión
- Perfil

Si el admin continúa viendo todos los módulos individuales en el menú principal, Vercel NO está sirviendo v1.21.1.

## 6. Cloudinary
No cambiar `CLOUDINARY_URL` en Render. Las imágenes existentes y las usadas por el PDF continúan utilizando Cloudinary.

## 7. Prueba rápida
1. Login administrador → comprobar versión y 5 módulos.
2. Abrir Centro de gestión → comprobar que siguen accesibles las herramientas avanzadas.
3. Login entrenador → comprobar 5 módulos.
4. Login cliente → comprobar 5 módulos y nueva vista Mi plan.
5. Descargar PDF de plan publicado.
6. Confirmar imágenes Cloudinary dentro de la app/PDF.
