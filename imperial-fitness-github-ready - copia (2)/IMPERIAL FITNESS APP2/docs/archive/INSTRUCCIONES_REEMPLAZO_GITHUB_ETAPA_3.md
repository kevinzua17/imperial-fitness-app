# INSTRUCCIONES PARA REEMPLAZAR EN GITHUB — ETAPA 3

Este paquete corresponde a la etapa de corrección de:

- Nutrición precisa por gramos.
- Generador de rutinas por grupo muscular.
- Variación de rutinas desde admin.
- Imagen grande del ejercicio para cliente.

## Opción recomendada: reemplazo por carpetas

En tu repositorio de GitHub reemplaza estas carpetas completas:

```text
src/
backend/
dist/
```

Y reemplaza también estos archivos raíz:

```text
package.json
package-lock.json
index.html
```

Luego sube los cambios a GitHub.

## Opción mínima: reemplazo selectivo

Si no quieres reemplazar todo, los archivos principales modificados son:

```text
src/components/PersonalPlanView.tsx
src/data/gymProgramming.ts
src/components/ExerciseImage.tsx
src/data/mockData.ts
dist/index.html
```

Si usas Vercel, Netlify o GitHub Pages desde código fuente, lo más importante es reemplazar `src/` y dejar que la plataforma ejecute el build.

Si subes manualmente la web compilada, debes reemplazar también:

```text
dist/index.html
```

## Validación local recomendada

Después de reemplazar, ejecuta:

```bash
npm install
npx tsc --noEmit --pretty false
npm run build
```

## Qué revisar desde la app

1. Entrar como admin.
2. Ir al módulo de planes personales.
3. Generar dieta para un cliente con peso, talla, edad, género, grasa corporal y masa muscular.
4. Verificar el bloque **Control de precisión del plan actual**.
5. Generar rutina superior y confirmar que no salgan ejercicios de pierna.
6. Generar rutina inferior y confirmar que no salgan ejercicios de pecho, espalda, hombro o brazos.
7. Generar rutina GAP + ABS y revisar que salgan glúteo, abdomen y pierna.
8. Generar Full Body y revisar que combine inferior, superior, core y acondicionamiento.
9. Desde cliente, tocar una imagen de ejercicio y confirmar que se abre grande.
