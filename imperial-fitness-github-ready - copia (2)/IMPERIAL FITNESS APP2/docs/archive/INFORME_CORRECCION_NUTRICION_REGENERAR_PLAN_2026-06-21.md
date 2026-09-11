# Corrección nutrición: regenerar plan sin bloqueo por base vacía

## Problema detectado
Al intentar generar una dieta diferente para un cliente, la pantalla mostraba:

> Generación automática pausada: la base nutricional profesional no está disponible en este momento.

La causa era un bloqueo en `src/components/PersonalPlanView.tsx`: si el listado de alimentos del servidor venía vacío o no respondía, la generación automática se detenía, aunque la app ya tenía una base nutricional incorporada en `src/data/foodDatabase.ts`.

## Corrección aplicada
Se eliminó el bloqueo que detenía la generación automática cuando la base del servidor no estaba disponible.

Ahora el flujo es:

1. El entrenador/admin pulsa **Generar y asignar dieta** o **Generar otra dieta**.
2. La app genera una variante nueva usando la base nutricional disponible.
3. Si la base del servidor no responde, usa la base incorporada de la app.
4. Intenta guardar el plan como nuevo plan activo del cliente.
5. Si no logra guardar, deja el plan como borrador visible y muestra un mensaje normal para reintentar.

## Mejora adicional
Se agregaron variantes automáticas para que, si el plan asignado no gusta, el botón no repita siempre la misma dieta. Ahora rota entre estilos:

- Clásica Imperial.
- Digestiva Ligera.
- Colombiana Práctica.
- Alto Rendimiento.

## Archivo modificado

- `src/components/PersonalPlanView.tsx`

## SQL
No requiere SQL nuevo.

## Render / Vercel
No requiere variables nuevas.
Solo requiere subir cambios y hacer redeploy normal.

## Prueba recomendada
1. Entrar como admin o entrenador.
2. Abrir Plan Personalizado.
3. Seleccionar un cliente.
4. Pulsar **Generar y asignar dieta**.
5. Pulsar luego **Generar otra dieta**.
6. Confirmar que cambia la combinación de alimentos y que queda asignada.
7. Entrar como cliente y confirmar que ve la última dieta asignada.
