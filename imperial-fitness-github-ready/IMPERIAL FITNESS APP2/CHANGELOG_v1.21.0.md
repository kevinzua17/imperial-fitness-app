# Imperial Fitness v1.21.0 Simple

## Objetivo
Reducir la complejidad visible sin perder la potencia profesional del producto. La experiencia del cliente queda concentrada en cinco trabajos principales: **Hoy, Mi plan, Progreso, Mi coach y Perfil**.

## Cambios principales
- Navegación centralizada por rol mediante `src/app/modules.ts`.
- Dashboard del cliente simplificado y orientado a la siguiente acción.
- Nueva vista `ClientPlanView`: rutina publicada, imágenes, registro de series, sugerencia de progresión, alimentación y descarga PDF.
- Progreso unificado en `ProgressHubView`.
- Chat/soporte unificado en `CoachHubView`.
- Perfil, membresía y pagos unificados en `AccountHubView`.
- Generador PDF protegido en backend para rutina + imágenes + alimentación publicada.
- Auditoría de volumen semanal para el profesional.
- Técnicas de intensidad desactivadas por defecto para privilegiar adherencia/progresión.
- Ficha nutricional de seguridad: alergias, intolerancias, exclusiones, preferencias, patrón alimentario, condiciones médicas y medicación.
- Publicación nutricional bloqueable ante incompatibilidades conocidas.
- Sustituciones de cliente versionadas para no pisar silenciosamente el plan profesional publicado.
- Tipos de dominio separados de `mockData.ts` (que queda como puente de compatibilidad).
- Endurecimiento de sesión del frontend: access token en memoria y refresh mediante cookie existente.

## Correcciones de estabilidad
- Corregido `changed_items` / `_changed_items` en flujo nutricional.
- Corregida compatibilidad de estados `draft/published/archived` al crear planes.
- Categorías de alimento alineadas entre catálogo y dominio (`fruit`, `dairy`, `snack`).
- Eliminado código de cliente duplicado e inalcanzable del dashboard después de la nueva experiencia simplificada.
- Corregida actualización de borradores de series para evitar sobrescrituras duplicadas.

## Supabase
- Migración `035` corregida sin índice funcional `COALESCE` problemático.
- Migraciones `027` y `028` endurecidas para instalaciones nuevas: `measured_at` y `recorded_at` usan el mismo tipo de `created_at`.
- Eliminado el índice `idx_body_metrics_user_effective_date_desc` basado en tipos temporales mixtos.
- Nueva migración `036_simplified_experience_nutrition_safety.sql`.

## Validación disponible en este entorno
- Backend: compilación sintáctica Python OK.
- Secret scan: OK.
- Production readiness estático v1.21.0: OK.
- Parser TypeScript/TSX: OK.
- Validación semántica asistida con stubs: sin errores estructurales en los archivos v1.21.0 modificados.
- Motor PDF: prueba de generación real OK.

## Validación que debe ejecutar CI/equipo con acceso a npm
Este entorno no puede resolver `registry.npmjs.org`, por lo que la instalación completa de dependencias no se pudo reconstruir aquí. En GitHub/local ejecutar:

```bash
npm ci
npm run typecheck
npm run test
npm run build
```

La falta de ese paso no se debe presentar como un build de producción certificado hasta que CI lo ejecute satisfactoriamente.
