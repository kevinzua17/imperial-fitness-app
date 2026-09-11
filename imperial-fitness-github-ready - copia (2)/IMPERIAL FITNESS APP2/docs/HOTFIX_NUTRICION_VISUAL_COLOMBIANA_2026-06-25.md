# Hotfix nutrición visual colombiana - 2026-06-25

## Objetivo
Mejorar la experiencia del cliente en alimentación reduciendo texto visible, aumentando claridad móvil y ampliando la base local con alimentos comunes en Colombia.

## Cambios aplicados
- Base nutricional local ampliada a 134 alimentos.
- Se agregaron verduras, frutas, lácteos, proteínas y platos/acompañamientos comunes en Colombia.
- Se agregaron alimentos como fríjoles, lentejas, pasta integral, queso cuajada, mozzarella, res, cerdo, pescados colombianos, ajiaco, sancocho, patacón, arepas y más.
- Vista de alimentación del cliente convertida a tarjetas visuales móviles.
- Macros principales visibles primero; detalles se abren solo si el usuario quiere.
- Criterio nutricional largo queda colapsado bajo "Ver criterio del nutricionista".
- Base profesional de alimentos ahora muestra tarjetas compactas con emoji/categoría/macros y notas bajo demanda.
- Sustituciones permiten lácteos como alternativa proteica y frutas/platos simples como carbohidratos cuando aplica.
- Service worker actualizado a v9 para refrescar mejor la PWA.

## Alcance
- No se tocó Supabase.
- No se ejecutó SQL.
- No se cambiaron tablas ni políticas.
- Los valores son aproximados por 100g de porción comestible y deben validarse por un profesional si se usan para prescripción clínica estricta.

## Validación
- Frontend typecheck OK.
- Frontend tests OK: 14 passed.
- Frontend build OK.
- Backend tests OK: 39 passed.
- Secret scan OK.
- Production readiness OK.
