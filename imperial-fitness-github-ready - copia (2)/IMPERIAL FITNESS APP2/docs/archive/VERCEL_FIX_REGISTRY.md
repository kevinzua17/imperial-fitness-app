# Corrección para deploy en Vercel

Se corrigió el problema de instalación donde `package-lock.json` apuntaba a un registry interno `packages.applied-caas-gateway1.internal.api.openai.org`, inaccesible para Vercel.

Cambios realizados:

1. `package-lock.json`: reemplazadas las URLs internas por `https://registry.npmjs.org/`.
2. `.npmrc`: agregado para forzar el registry público de npm y `legacy-peer-deps=true`.
3. `vercel.json`: agregado `installCommand` limpio: `npm ci --legacy-peer-deps --no-audit --no-fund`.
4. `package.json`: agregado `engines.node = 22.x` para evitar problemas con versiones modernas de Vite/Tailwind.

En Vercel, revisa también:

- Settings → Build & Development Settings → Install Command. Debe estar vacío o usar: `npm ci --legacy-peer-deps --no-audit --no-fund`.
- Settings → Environment Variables. No debe existir `NPM_CONFIG_REGISTRY` apuntando a un registry interno.

Luego haz redeploy con cache limpio.
