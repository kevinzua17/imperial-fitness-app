# App shell

Objetivo del refactor progresivo:

- sacar estado global de `App.tsx`
- crear providers por dominio
- mover rutas a `AppRoutes`
- usar React Query o equivalente para cache de datos remotos

Estado actual:

- `App.tsx` sigue siendo el orquestador principal para no romper beta.
- La arquitectura de carpetas `features/*` queda preparada para refactor incremental.