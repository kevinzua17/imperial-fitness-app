# Informe de ajuste: nutrición inteligente y cambio selectivo de rutinas

Fecha: 2026-06-21

## Objetivo
Corregir el flujo de generación para que el administrador/entrenador no tenga que regenerar planes completos cuando solo desea cambiar una parte del plan.

## Nutrición
Se reforzó la generación selectiva de comidas:

- El profesional puede marcar solo las comidas que desea cambiar.
- Las comidas desmarcadas se conservan.
- Las comidas nuevas se recalculan considerando el objetivo calórico y los macros diarios.
- Cuando se hace una generación parcial, el sistema calcula los macros de las comidas conservadas y reparte el objetivo restante entre las comidas nuevas.
- Se agrega resumen técnico de balance final aproximado: kcal, proteína, carbohidratos y grasas.

## Entrenamiento
Se agregó cambio inteligente de ejercicios dentro de la rutina activa:

- Permite seleccionar ejercicios específicos para cambiar.
- Conserva los ejercicios que ya funcionan.
- Respeta grupo muscular, patrón de movimiento, nivel, equipo disponible y limitaciones activas.
- Mantiene series, repeticiones y descansos para proteger la progresión.
- Marca ejercicios con señal de progresión como “Progresión protegida”.
- Permite indicar motivo del cambio:
  - Variación controlada.
  - No le gusta al cliente.
  - Genera molestia.
  - Máquina/equipo no disponible.
  - Está muy difícil.
  - Está muy fácil.

## Seguridad operativa
- Si existen limitaciones de severidad alta, el cambio automático queda bloqueado.
- Si no hay reemplazo seguro equivalente, el ejercicio no se reemplaza y se deja nota de revisión manual.
- Los cambios quedan visibles como borrador si no se confirma el guardado.

## Archivos modificados
- src/components/PersonalPlanView.tsx

## SQL / Supabase
No requiere migración SQL nueva.

## Render / Vercel
No requiere variables nuevas.
Solo redeploy después de subir los cambios.

## Validación
Se intentó ejecutar typecheck, pero el entorno local no tenía todas las dependencias instaladas correctamente. Antes de producción se debe ejecutar:

```bash
npm ci
npm run typecheck
npm run build
```
