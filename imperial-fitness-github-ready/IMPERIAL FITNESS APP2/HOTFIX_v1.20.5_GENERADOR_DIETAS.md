# Imperial Fitness v1.20.5 — Hotfix del generador de dietas

## Problema corregido

La dieta automática podía alcanzar las calorías objetivo, pero no necesariamente los tres macronutrientes. La causa era que cada porción se calculaba usando un nutriente principal y después se hacía una normalización únicamente calórica. Los aportes cruzados de cada alimento podían dejar la proteína, los carbohidratos o las grasas fuera de tolerancia, por lo que el mismo validador bloqueaba la publicación.

## Solución implementada

- Equilibrador de cuatro metas: calorías, proteína, carbohidratos y grasas.
- Ajuste automático de gramos sin cambiar alimentos, nombres, comidas ni etiquetas nutricionales.
- Límites de porción por categoría para evitar cantidades absurdas.
- La suma del frontend usa la misma lógica de redondeo final que el backend.
- La generación completa queda balanceada antes de guardar el borrador.
- En generación parcial, las comidas desmarcadas quedan bloqueadas y solo se ajustan las seleccionadas.
- Al publicar, el frontend realiza una segunda corrección automática si todavía existe una desviación.
- El backend repite la corrección como última barrera antes de publicar, evitando inconsistencias por redondeo o clientes desactualizados.
- La validación no fue eliminada: sigue exigiendo ±5 % en calorías, ±15 % en proteína y ±20 % en carbohidratos y grasas.

## Despliegue

1. Subir el contenido de v1.20.5 a GitHub.
2. Desplegar Render primero.
3. Confirmar `/health/live` y que la versión sea 1.20.5 en `/health`.
4. Desplegar Vercel sin reutilizar caché de compilación.
5. Iniciar sesión, abrir un cliente con datos corporales completos y generar una dieta nueva.
6. Revisar las porciones y pulsar “Guardar y enviar alimentación”.

## Supabase

No requiere SQL ni migración nueva. No modifica usuarios, contraseñas, medidas corporales ni dietas ya publicadas.
