# Changelog v1.20.0 — 5 de agosto de 2026

## Añadido

- Motor nutricional v2 auditable con validación de calorías y macros reales del menú.
- Actividad real, fuente de TMB y bloqueo de datos incompletos/menores.
- Borradores, versiones y aprobación de dietas.
- Biblioteca de ejercicios visible para clientes con mapa corporal SVG y filtros musculares.
- Controles de visibilidad, revisión y elegibilidad de rutina.
- Migración aditiva 034, diagnóstico SQL y scripts de verificación/carga.
- Readiness de esquemas v2, RLS y Redis con respuesta 503, caché del catálogo y refuerzo de Render/Vercel.

## Cambiado

- Dieta del cliente más limpia y sin imágenes decorativas.
- Nuevas mediciones ya no sobrescriben dietas publicadas.
- Catálogo de ejercicios con carga progresiva en lugar de límite fijo y base externa restringida a revisión profesional.
- Datos corporales ausentes se muestran como “Sin dato”.

## Infraestructura

- Entrega optimizada de imágenes públicas Cloudinary con formato/calidad automáticos y ancho limitado, conservando originales y privacidad de recursos autenticados.
- Diagnóstico de solo lectura para RLS, políticas y privilegios del rol SQL.
- Fallback controlado a memoria si Redis falla, sin convertir cada solicitud en error 500.

## Seguridad

- No se cambió autenticación, hashing, recuperación o manejo de refresh tokens.
- La migración no actualiza cuentas ni credenciales.
- Rollback de código sin eliminar las columnas aditivas.
