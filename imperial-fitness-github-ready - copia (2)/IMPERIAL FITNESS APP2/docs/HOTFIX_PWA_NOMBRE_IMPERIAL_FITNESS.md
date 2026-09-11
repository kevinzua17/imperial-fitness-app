# Hotfix PWA - Nombre instalado

Se corrigió el nombre visible de la aplicación instalada como PWA.

Cambios:

- `public/manifest.webmanifest`:
  - `name`: `Imperial Fitness`
  - `short_name`: `Imperial Fitness`
- `index.html`:
  - `application-name`: `Imperial Fitness`
  - `apple-mobile-web-app-title`: `Imperial Fitness`
- `src/components/LoginScreen.tsx`:
  - botón de acceso ajustado a `Ingresar a Imperial Fitness`.

Nota: en teléfonos donde ya estaba instalada como `Imperial`, puede ser necesario eliminar el acceso/app instalada y volver a instalarla para que el sistema operativo tome el nuevo nombre.
