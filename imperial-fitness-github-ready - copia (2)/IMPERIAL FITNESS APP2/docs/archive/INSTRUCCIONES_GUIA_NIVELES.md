# Imperial Fitness - Guía visual de niveles y retención

## Objetivo
Agregar dentro de la app una explicación visual y motivadora del sistema de gamificación:

- Rachas
- XP
- Monedas Imperiales
- Escudos Imperiales
- Día Perfecto Imperial
- Niveles: Recluta, Discípulo, Guerrero, Gladiador, Elite Imperial, Leyenda Imperial e Inmortal
- Beneficios/desbloqueos

## Archivos incluidos

Copiar y reemplazar/añadir:

```txt
src/components/GamificationGuide.tsx
src/components/GamificationPanel.tsx
src/components/GamificationAdminPanel.tsx
```

## Despliegue

Este ajuste es solo frontend.

1. Copiar carpeta `src` sobre el proyecto local.
2. GitHub Desktop → Commit: `Agrego guía visual de niveles y recompensas`.
3. Push origin.
4. Vercel desplegará automáticamente. Si no lo hace, usar Redeploy without cache.

No requiere Supabase.
No requiere Render.

## Dónde aparece

- Para cliente: dentro del panel de gamificación, como bloque expandible “Camino Imperial”.
- Para admin/entrenador: dentro del panel interno de retención, con enfoque administrativo.

## Intención de negocio

El cliente debe entender por qué debe volver a la app:

- mantener racha,
- ganar XP,
- subir nivel,
- acumular monedas,
- proteger su avance con escudos,
- aspirar a estatus dentro del gimnasio.

El admin entiende cómo usar estas métricas para retención sin mostrar información comercial sensible al cliente.
