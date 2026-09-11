# Imperial Fitness v1.21.0 Simple — Trazabilidad de los 21 puntos de auditoría

Este documento relaciona la auditoría inicial con los cambios implementados en el proyecto.

| # | Hallazgo / recomendación | Implementación v1.21.0 |
|---|---|---|
| 1 | Reducir complejidad global sin reconstruir todo | Se conserva backend/módulos existentes y se simplifica la capa visible del cliente. |
| 2 | Cliente con demasiados módulos | Navegación cliente reducida a **Hoy, Mi plan, Progreso, Mi coach y Perfil**. |
| 3 | La app debe responder “qué hago ahora” | Dashboard cliente orientado a siguiente entrenamiento, alimentación y progreso. |
| 4 | Inicio sobrecargado | Nueva vista cliente con dos acciones primarias y tres accesos secundarios. |
| 5 | Priorizar fundamentos de entrenamiento | Técnicas intensivas quedan en `sin_tecnicas` por defecto; auditoría de volumen semanal añadida. |
| 6 | Mejor progresión real | Registro de series usa peso/reps/RIR/serie prescrita y muestra sugerencia de progresión del backend. |
| 7 | No abrumar con splits | Plantillas fijas siguen como primera opción; el generador completo quedó dentro de un bloque **avanzado colapsado**. |
| 8 | Motor nutricional valioso pero debía conservarse | Se mantiene cálculo, versionado y balanceo existentes; se integran en experiencia simplificada. |
| 9 | Faltaban alergias/restricciones/condiciones | Perfil y migración 036 incorporan alergias, intolerancias, exclusiones, preferencias, patrón, condiciones y medicación. |
| 10 | Evitar sobreprometer personalización | UI/documentación describen revisión profesional y cálculo/porciones; no se sustituye al especialista. |
| 11 | Déficit y seguridad energética | Motor mantiene guardrails y suma advertencias para escenarios de baja disponibilidad energética/alta demanda. |
| 12 | Sustituciones no deben cambiar silenciosamente el plan | Sustitución de cliente genera variante/version y registra ajuste, evitando pisar el plan publicado original. |
| 13 | PDF de alto valor comercial | Implementado PDF de plan publicado con rutina, imágenes, macros, comidas e indicaciones. |
| 14 | PDF debe generarse en backend y con permisos | Endpoints `/reports/my-plan.pdf` y `/reports/clients/{id}/plan.pdf`; autorización por rol/propiedad. |
| 15 | `PersonalPlanView` era supermódulo | La experiencia de consumo cliente se separó a `ClientPlanView`; hubs nuevos extraen responsabilidades de navegación. |
| 16 | Doble fuente de verdad de navegación | `src/app/modules.ts` centraliza módulos, roles, etiquetas y redirecciones históricas. |
| 17 | Tipos vivían en `mockData.ts` | Tipos de dominio movidos a `src/types/domain.ts`; `mockData.ts` queda como puente de compatibilidad. |
| 18 | Endurecer sesión/seguridad | Access token pasa a memoria; refresh cookie existente sigue siendo la vía persistente; PDF no es público permanente. |
| 19 | Mantener potencia, ocultar ruido | Funciones antiguas permanecen para staff/compatibilidad; el cliente no navega por timer, tokens, amigos, etc. como módulos separados. |
| 20 | Producto debe seguir ciclo evaluación→plan→acción→registro→ajuste | La nueva navegación y los hubs siguen ese ciclo y eliminan rutas competitivas del cliente. |
| 21 | Prioridad: simplicidad + PDF + seguridad + adaptabilidad | Implementadas las tres primeras capas; progresión/volumen ya tienen señales para seguir refinando adaptación sin cambios silenciosos. |

## Correcciones técnicas adicionales

- Migraciones 027/028 endurecidas para instalaciones limpias.
- Migración 035 corregida para evitar `ERROR 42P17`.
- Migración 036 añadida.
- `changed_items`/`_changed_items` corregido.
- Categorías del catálogo alimentario alineadas con el dominio.
- Dashboard cliente antiguo duplicado eliminado.
- Metadatos `NutritionTargetApi` compatibles con persistencia en `calculation`.
- Creación de plan evita usar `archived` como estado de creación.
- Script de empaquetado actualizado para v1.21.0.

## Criterio de “100% listo para producción”

Funcionalmente y estructuralmente el paquete v1.21.0 está preparado para la última compuerta de CI. La etiqueta de producción debe colocarse **solo después** de que un entorno con acceso a npm complete:

```bash
npm ci
npm run typecheck
npm run test
npm run build
```

En el entorno de preparación actual esa compuerta no puede ejecutarse porque no existe resolución DNS hacia `registry.npmjs.org`.
