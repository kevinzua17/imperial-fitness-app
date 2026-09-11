# Informe de corrección: generación selectiva de comidas

## Problema detectado
En el módulo de nutrición, al generar una dieta diferente se reemplazaba el plan completo. Esto era incómodo cuando al entrenador/admin le gustaba una comida específica, por ejemplo el desayuno, pero quería cambiar solo el almuerzo o la cena.

## Solución aplicada
Se agregó un flujo de generación selectiva de dieta:

- Si el cliente no tiene dieta, el botón genera la dieta completa.
- Si el cliente ya tiene dieta, aparece un selector de comidas.
- El entrenador/admin puede marcar o desmarcar comidas antes de generar.
- Las comidas marcadas se regeneran.
- Las comidas desmarcadas se conservan exactamente como estaban.

## Comidas disponibles para selección
El selector trabaja sobre las comidas actuales del plan:

- Desayuno
- Almuerzo
- Snack
- Cena

Si existieran comidas con nombres personalizados, el sistema conserva el orden y las muestra como comida correspondiente.

## Nueva experiencia de uso
1. El entrenador genera una dieta inicial.
2. Revisa desayuno, almuerzo, snack y cena.
3. Si una comida le gusta, la desmarca.
4. Si una comida no le gusta, la deja seleccionada.
5. Pulsa “Regenerar comidas seleccionadas”.
6. El sistema cambia solo esas comidas y conserva las demás.

## Persistencia
Si el plan ya existe en la base, se actualiza el mismo plan activo.
Si el plan aún no está guardado, se crea como nuevo plan asignado.
Si hay una interrupción de conexión, el plan queda visible como borrador para revisión.

## Archivo modificado
- `src/components/PersonalPlanView.tsx`

## SQL
No requiere SQL nuevo.

## Render / Vercel
No requiere variables nuevas. Solo redeploy después de subir el cambio.
