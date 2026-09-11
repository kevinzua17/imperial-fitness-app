# Auditoría técnica Camino Imperial — registros, filtros y lanzamiento controlado

Fecha: 2026-06-20  
Proyecto revisado: IMPERIAL FITNESS APP2

## 1. Dictamen ejecutivo

El proyecto está visualmente avanzado y ya cuenta con arquitectura funcional de frontend React/Vite y backend FastAPI con persistencia SQL para check-ins, hábitos, métricas corporales, fotos de progreso, eventos XP, monedas, insignias y metas de fuerza.

Dictamen realista: **GO condicionado para lanzamiento controlado**, no para lanzamiento masivo público. El producto puede probarse con un grupo reducido de usuarios reales si antes se ejecutan las migraciones, se validan registros de extremo a extremo y se activa un proceso mínimo de soporte, respaldo y monitoreo.

Nivel de terminación estimado:

- Visual/gamificación: 80–90% para piloto.
- Persistencia base: 70–80%, pendiente validar en base real.
- Historial y filtros por fecha: reforzado en esta intervención.
- Seguridad/operación comercial: 55–65%, requiere endurecimiento antes de cobros masivos.
- Listo para piloto controlado: 75–80%.
- Listo para mercado abierto: 60–65%.

## 2. Hallazgo principal sobre registros

El sistema no parece estar completamente “sin guardado”. Existen rutas y tablas para guardar datos reales. El problema detectado es más específico:

1. El historial cargaba cantidades fijas de datos sin filtros por fecha.
2. El panel administrativo de Camino Imperial consultaba datos centrados en la semana actual o datos acumulados sin selección clara de periodo.
3. Esto podía hacer que el usuario percibiera que no había registros históricos o que la aplicación cargara más información de la necesaria.
4. La validación depende de que las migraciones de Supabase estén ejecutadas en producción.

## 3. Cambios técnicos realizados

### 3.1. Historial de evolución

Se agregó filtro por periodo en backend y frontend para revisar registros por:

- Última semana.
- Último mes.
- Últimos 2 meses.
- Últimos 3 meses.
- Todo el historial, limitado para evitar cargas pesadas.

Archivos modificados:

- `backend/app/routers/history.py`
- `src/services/historyService.ts`
- `src/components/EvolutionHistoryView.tsx`

El endpoint de historial ahora acepta parámetros de periodo y fecha, y filtra desde la base de datos antes de enviar la respuesta. Esto reduce carga, mejora velocidad y evita traer datos innecesarios al navegador.

### 3.2. Panel administrativo Camino Imperial

Se agregó filtro de periodo para seguimiento interno de constancia:

- Última semana.
- Último mes.
- Últimos 2 meses.
- Últimos 3 meses.

Se evitó exponer “todo el historial” en el panel administrativo para no saturar la consulta operativa diaria.

Archivos modificados:

- `backend/app/routers/gamification.py`
- `src/services/gamificationService.ts`
- `src/components/GamificationAdminPanel.tsx`

### 3.3. Optimización de consultas

Se limitó la búsqueda de completados de hábitos para cálculo de rachas a una ventana razonable, evitando recorrer indefinidamente el historial completo.

También se agregó una migración complementaria de índices:

- `backend/supabase/migrations/022_history_period_filters_indexes.sql`

Esta migración crea índices para mejorar consultas por usuario y fecha en publicaciones comunitarias y logs de metas de fuerza.

## 4. Recomendaciones obligatorias antes del piloto

Antes de abrir el piloto controlado:

1. Ejecutar migraciones de Supabase en orden, incluyendo `022_history_period_filters_indexes.sql`.
2. Crear usuarios de prueba con roles: cliente, entrenador/admin y superadmin si aplica.
3. Probar que se guarden y se consulten correctamente:
   - Check-ins diarios.
   - Hábitos completados.
   - Métricas corporales.
   - Fotos de progreso.
   - Metas de fuerza.
   - Eventos XP y monedas.
4. Validar filtros por fecha con datos reales de al menos 7, 30, 60 y 90 días.
5. Activar respaldo de base de datos.
6. Definir política básica de privacidad, consentimiento de uso de datos físicos y manejo de imágenes de progreso.
7. Activar monitoreo de errores en producción.
8. Revisar reglas de seguridad/RLS en Supabase.
9. Validar que el sistema de premios no pueda ser manipulado desde el frontend.
10. Evitar monetización masiva hasta tener evidencia de estabilidad.

## 5. Pruebas técnicas realizadas en esta revisión

Se validó compilación Python de los módulos modificados:

- `backend/app/routers/history.py`
- `backend/app/routers/gamification.py`
- `backend/app`

Resultado: compilación Python correcta.

No se pudo completar la prueba automatizada de frontend ni backend en este entorno por dependencias no disponibles o incompletas:

- `npm run typecheck` no pudo completarse por ausencia/inconsistencia de dependencias de Node.
- `pytest` no pudo completarse por dependencia Python faltante (`jose`).

Pruebas recomendadas en entorno local o CI:

```bash
npm ci
npm run typecheck
npm run build
npm test -- --run

cd backend
pip install -r requirements.txt
pytest -q
```

## 6. Valor comercial estimado en Colombia

Para Colombia, esta aplicación no debe valorarse como una landing page ni como un prototipo simple. Ya incluye frontend, backend, autenticación, componentes de seguimiento, gamificación y administración.

Valor técnico estimado del estado actual para piloto controlado:

- Rango conservador: USD 10.000–20.000.
- Rango razonable si se entrega documentada, desplegada y probada: USD 20.000–35.000.

Valor si se lleva a producto comercial más robusto:

- USD 35.000–80.000 o más, dependiendo de pagos, analítica, app móvil, notificaciones, seguridad, QA, soporte y escalabilidad.

Costos mensuales posibles:

- Mantenimiento liviano/freelance: COP 1,5–5 millones mensuales.
- Soporte más profesional con SLA, QA y mejoras: COP 6–15 millones mensuales.
- Infraestructura inicial: bajo costo si se mantiene en Supabase/Vercel/Render, pero debe subir con usuarios, fotos y analítica.

## 7. Plan de ingresos recomendado para el gimnasio

### Fase 1 — Piloto sin fricción

Objetivo: demostrar que la app aumenta asistencia, adherencia y renovación.

- Incluir Camino Imperial gratis para 30–50 usuarios seleccionados.
- Medir asistencia semanal, check-ins, rachas, progreso y retención.
- Comparar usuarios con app vs usuarios sin app.

### Fase 2 — Monetización como plan premium

Agregar un plan “Imperial Premium”:

- Seguimiento digital.
- Retos mensuales.
- Medallas, niveles y ranking.
- Revisión básica del entrenador.
- Beneficios dentro del gimnasio.

Precio sugerido:

- COP 15.000–30.000 adicionales por usuario/mes.

Escenario de ingresos:

- 100 usuarios premium x COP 20.000 = COP 2.000.000/mes.
- 300 usuarios premium x COP 20.000 = COP 6.000.000/mes.
- 500 usuarios premium x COP 20.000 = COP 10.000.000/mes.

### Fase 3 — Servicios de mayor valor

Servicios adicionales:

- Seguimiento nutricional básico.
- Planes personalizados.
- Reto de transformación de 8 o 12 semanas.
- Mentoría de entrenador.
- Reporte mensual de progreso.

Precio sugerido:

- COP 40.000–120.000 por usuario/mes, según acompañamiento.

### Fase 4 — Ingresos indirectos

- Convenios con marcas deportivas o nutricionales.
- Premios patrocinados para retos.
- Descuentos internos por constancia.
- Venta de suplementos, ropa o servicios aliados.

Importante: las monedas o recompensas de la app deben funcionar como incentivo interno, no como dinero redimible sin control, para evitar abuso o pérdidas económicas.

## 8. Indicadores clave para decidir si lanzar

Durante el piloto se deben medir:

- Usuarios activos semanales.
- Check-ins por usuario/semana.
- Retención a 7, 30 y 60 días.
- Frecuencia de asistencia al gimnasio.
- Porcentaje de usuarios que completan hábitos.
- Usuarios recuperados por WhatsApp o seguimiento del entrenador.
- Renovaciones de membresía.
- Ingresos por plan premium.
- Errores reportados y tiempo de respuesta.

## 9. Conclusión técnica

Camino Imperial ya tiene una base fuerte como herramienta de fidelización y gamificación para gimnasio. El proyecto puede avanzar a piloto controlado si se validan registros reales, filtros por fecha, migraciones, seguridad mínima y estabilidad.

El mayor valor de la aplicación no está solo en mostrar medallas o niveles, sino en convertir datos de comportamiento en acciones comerciales: retener usuarios, detectar abandono, activar seguimiento por entrenador y vender planes premium de acompañamiento.
