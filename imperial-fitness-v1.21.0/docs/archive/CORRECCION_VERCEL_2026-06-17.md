# Corrección de despliegue en Vercel — 2026-06-17

## Causa encontrada

El `package-lock.json` todavía contenía 40 URLs del registro interno:

`packages.applied-caas-gateway1.internal.api.openai.org`

Ese dominio no es accesible desde Vercel. El proyecto que sí funcionaba tenía 0 referencias a ese dominio.

## Cambios aplicados

1. Se reemplazaron las 40 URLs internas por `https://registry.npmjs.org/`.
2. Se agregó `replace-registry-host=never` a `.npmrc` para evitar que un entorno con registry privado vuelva a modificar el lockfile.
3. Se mantuvieron Node `22.x`, Vite `8.0.16` y el comando de instalación existente.

## Verificación

- `npm ci --legacy-peer-deps --no-audit --no-fund`: correcto.
- `npm run build`: correcto.
- Referencias al registry interno después de la corrección: 0.
