# Hotfix: entrada directa en mediciones corporales

## Fecha
2026-06-24

## Módulo afectado
- Mis medidas corporales
- Seguimiento desde administrador/entrenador
- Formulario: Registrar medición corporal

## Problema corregido
Los campos numéricos de la medición corporal usaban `input type="number"`. En varios navegadores esto obliga al usuario a modificar valores con scroll o flechas, y al borrar el campo el valor se convertía inmediatamente en `0`, dificultando ingresar una medida exacta.

## Solución aplicada
Se reemplazó el control numérico del formulario por una entrada editable directa con:

- `type="text"`
- `inputMode="decimal"` para peso, estatura, masa muscular, grasa corporal y TMB
- `inputMode="numeric"` para edad y grasa visceral
- selección automática del valor al enfocar
- posibilidad de borrar todo el número y escribir el valor deseado
- soporte de punto o coma decimal
- normalización y límites al salir del campo

## Archivo modificado
- `src/components/ProgressAnalyticsView.tsx`

## Validación funcional esperada
1. Entrar como cliente a **Mis medidas**.
2. Borrar completamente el número de Peso, Estatura, Edad, Masa muscular, Grasa corporal, Grasa visceral o TMB.
3. Escribir manualmente el número deseado.
4. Confirmar que no se requieren flechas ni scroll.
5. Entrar como admin/entrenador a **Seguimiento** y repetir la prueba en **Registrar medición corporal**.

## Nota
No se tocó Supabase, no se ejecutó SQL y no se cambiaron tablas, políticas ni datos.
