# Informe — Rutinas automáticas por modos inteligentes

## Objetivo del ajuste
Se actualizó el generador automático de rutinas para que no produzca planes genéricos por división simple, sino programas completos con lógica de entrenamiento según nivel, frecuencia semanal y objetivo.

## Modos incorporados

1. **Full Body 3 días**
   - Nivel sugerido: Principiante.
   - Objetivo sugerido: Fuerza general.
   - Enfoque: optimizar tiempo, practicar técnica y trabajar cuerpo completo tres veces por semana.

2. **Torso / Pierna 4 días**
   - Nivel sugerido: Intermedio.
   - Objetivo sugerido: fuerza y equilibrio muscular.
   - Enfoque: alternar torso y tren inferior para mejorar volumen, recuperación y progresión.

3. **Push / Pull / Legs 3 días**
   - Nivel sugerido: Intermedio.
   - Objetivo sugerido: hipertrofia estética con volumen moderado.
   - Enfoque: empuje, jalón y pierna una vez por semana.

4. **Push / Pull / Legs 6 días**
   - Nivel sugerido: Avanzado.
   - Objetivo sugerido: hipertrofia estética con mayor frecuencia y volumen.
   - Enfoque: repetir push/pull/legs dos veces por semana con variaciones A y B.

5. **Arnold Split 6 días**
   - Nivel sugerido: Avanzado.
   - Objetivo sugerido: hipertrofia estética.
   - Enfoque: pecho + espalda, hombro + brazos y pierna/GAP, con repetición semanal.

6. **GAP 3 días**
   - Nivel sugerido: Intermedio.
   - Objetivo sugerido: hipertrofia estética.
   - Enfoque: glúteo, abdomen y pierna sin mezclar torso.

## Mejoras técnicas aplicadas
- Se reemplazó la lógica de división simple por presets de programas.
- Cada modo define cantidad de días, nivel sugerido, objetivo sugerido, propósito y descripción premium.
- Al elegir un modo, la interfaz ajusta automáticamente nivel, objetivo y días sugeridos.
- La rutina generada respeta grupo muscular, patrón de movimiento, nivel, equipo disponible y limitaciones activas.
- Se mantiene el reemplazo inteligente: si un ejercicio no gusta, puede marcarse y cambiarse por uno equivalente del mismo grupo muscular.
- El sistema conserva series, repeticiones y descansos cuando se reemplaza un ejercicio para proteger la progresión.
- Se corrigió una duplicación interna en la priorización del catálogo de ejercicios.

## Archivos principales modificados
- `src/data/gymProgramming.ts`
- `src/components/PersonalPlanView.tsx`

## SQL / Supabase
No requiere SQL nuevo.

## Render / Vercel
No requiere variables nuevas. Solo redeploy normal después de subir la versión.

## Validación realizada
Se validó compilación aislada de `src/data/gymProgramming.ts` con TypeScript. No se pudo ejecutar el build completo del proyecto porque el entorno no tiene instaladas todas las dependencias de Node/React.

## Pruebas recomendadas antes de producción
1. Crear una rutina Full Body 3 días para cliente principiante.
2. Crear una rutina Torso/Pierna 4 días para cliente intermedio.
3. Crear PPL 3 y PPL 6.
4. Crear Arnold Split 6 días para cliente avanzado.
5. Crear GAP 3 días.
6. Marcar un ejercicio que no gusta y reemplazarlo.
7. Confirmar que el reemplazo respeta grupo muscular y no mezcla torso con pierna.
8. Probar con cliente sin limitaciones activas.
9. Probar con limitación leve o moderada.
10. Confirmar que limitación alta sigue bloqueando generación automática por seguridad.
