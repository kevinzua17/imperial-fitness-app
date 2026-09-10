# Implementación Imperial Fitness v1.21.0 — P0 a P6

## Estado de la intervención

La versión v1.21.0 consolida el producto en una sola base técnica con tres experiencias: Pro, Lite y Premium. No se creó una segunda base de datos ni un backend paralelo.

### P0 — Recuperar acceso

- Se consolidó la versión de entrega en v1.21.0.
- Backend informa versión y commit en health endpoints.
- Frontend expone versión/commit de build en `window.__IMPERIAL_BUILD__`.
- `health/live` sirve para liveness de Render; `health/ready` comprueba base/migraciones; `health/capabilities` separa Redis/SMTP/Cloudinary/Uptime.
- Servicios opcionales dejaron de impedir el arranque completo de producción.
- Mensaje de auth indica migraciones pendientes cuando el esquema no corresponde.
- Script `recover_admin_access.py` permite diagnosticar y desbloquear un admin existente sin elevar privilegios ni modificar contraseña.
- Script `verify_v121_deployment.py` verifica backend real y puede ejecutar un login real sin imprimir credenciales/tokens.

### P1 — Estabilizar y aligerar

- `/lite` usa import dinámico independiente y evita descargar la aplicación Pro/Premium completa.
- `CoachOperationsPanel`, `LitePortal` y `useFoodImageOverrides` están separados del componente histórico de planes.
- Consultas del panel de atención, publicaciones y enlaces se cargan por lotes para evitar N+1.
- CI ejecuta secret scan, readiness, guard v1.21, pytest, TypeScript, Vitest y build.
- `production_readiness_check.py` dejó de certificar versiones antiguas.
- La entrega limpia excluye el segundo árbol antiguo, `.git`, caches, DB locales y dependencias instaladas.

### P2 — Imperial Fitness Lite

Portal responsive, pensado para abrir desde WhatsApp o navegador móvil sin instalación. Incluye:

- identidad básica del cliente;
- cuestionario inicial;
- check-in rápido;
- entrenamiento vigente;
- alimentación vigente;
- historial de evolución;
- descarga de PDFs publicados.

El administrador puede clasificar a cada cliente como Lite, Híbrido o Premium.

### P3 — Check-ins por enlace seguro

- token criptográfico aleatorio;
- solo hash en base de datos;
- token en fragmento `#token=`, no query string;
- intercambio por POST body;
- URL eliminada del navegador antes del intercambio;
- sesión Lite separada del JWT principal;
- cabecera `X-Lite-Session`;
- sesión máxima de 12 horas y nunca posterior al vencimiento del enlace;
- revocación del enlace y de sesiones hijas;
- autorización por usuario en cada ruta.

### P4 — Generador/publicación profesional

El flujo queda: fuente del plan → validación → bloqueos/advertencias → revisión explícita → publicación versionada → PDF + portal Lite.

Bloqueos contemplados incluyen, según el tipo de plan: dolor alto reciente, limitaciones físicas severas, cuestionario con señales médicas, embarazo/lactancia, enfermedad renal, antecedente de TCA, menores de edad, rutina vacía o calorías inválidas. Otras condiciones generan advertencias que requieren confirmación explícita del coach.

La publicación guarda un snapshot; cambiar posteriormente el borrador no reescribe lo que fue publicado.

### P5 — Seguimiento inteligente

El panel prioriza clientes por puntaje y razones visibles:

- check-in ausente o vencido;
- dolor, especialmente ≥7/10;
- adherencia nutricional baja;
- energía baja;
- sueño bajo;
- estrés alto;
- cambio de peso ≥5% entre seguimientos recientes;
- cuestionario inicial pendiente;
- perfil físico incompleto;
- entrenamiento/alimentación activa faltante;
- plan activo sin versión profesional publicada;
- publicación profesional sin renovar después de 42 días.

### P6 — Premium preservado

Los módulos existentes de comunidad, Camino Imperial, recompensas, retos, social y otros continúan disponibles para Premium. Lite recibe navegación mínima y Híbrido permite combinar app completa con enlaces simples.

## Criterios profesionales

### Entrenamiento

Los datos de dolor/lesiones actúan como barrera de seguridad. Las reglas automáticas no se presentan como diagnóstico médico y los casos de alto riesgo bloquean la publicación automática de entrenamiento.

### Nutrición

El cuestionario agrega embarazo/lactancia, diabetes, enfermedad renal, hipertensión, TCA, digestivo, alergias, medicación, preferencias, cocina y presupuesto. Los casos de riesgo dejan de ser tratados como una simple ecuación de calorías/macros.

### Trazabilidad

Cada publicación profesional tiene tipo, versión, fuente, aprobador, fecha, snapshot y advertencias. Esto evita que un documento ya entregado cambie silenciosamente.
