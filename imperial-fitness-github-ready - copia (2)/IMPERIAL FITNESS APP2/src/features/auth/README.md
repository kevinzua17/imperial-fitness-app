# Auth feature

Contiene flujo de autenticacion, sesion y recuperacion de cuenta.

Servicios actuales usados:

- `src/services/authService.ts`
- `src/services/api.ts`

Siguiente refactor recomendado:

- mover `authService.ts` a esta carpeta
- crear `useAuthSession.ts`
- mover LoginScreen a `features/auth/components`