# Fase 10 – Preparación de prueba piloto

## Objetivo
Dejar Imperial Fitness AI Ecosystem listo para una beta privada controlada con usuarios reales, separando correctamente lo que ve y puede hacer cada rol: administrador, entrenador y cliente.

## Estado de entrega
- Backend validado con pruebas automáticas de permisos, planes, rutinas, alimentos, chat, solicitudes, avatar y recuperación de contraseña.
- Frontend compilado para producción.
- Navegación protegida por rol también desde la aplicación, no solo desde el menú visible.
- Módulos internos ocultos para clientes: auditoría, finanzas, accesos, asistente interno e implementación.
- Herramientas profesionales de alimentos/rutinas/dietas visibles solo para admin/entrenador.
- Cliente ve únicamente su experiencia final: plan, rutina, progreso, perfil, comunidad, chat, retos y recompensas.

## Matriz de roles para piloto

| Módulo / acción | Admin | Entrenador | Cliente |
|---|---:|---:|---:|
| Dashboard general | Sí | Sí, limitado a operación | Sí, personal |
| Gestión de usuarios | Sí | Solo clientes asignados | No |
| Control financiero | Sí | No | No |
| Auditoría SyncHub | Sí | No | No |
| Crear/editar dieta | Sí | Sí, clientes asignados | No |
| Crear dieta manual | Sí | Sí, clientes asignados | No |
| Ver dieta asignada | Sí | Sí, clientes asignados | Sí, solo propia |
| Retirar dieta | Sí | Sí, clientes asignados | No |
| Crear/editar rutina | Sí | Sí, clientes asignados | No |
| Crear plantilla manual de rutina | Sí | Sí | No |
| Ver rutina asignada | Sí | Sí, clientes asignados | Sí, solo propia |
| Base de alimentos | Sí | Sí | Solo lectura operativa dentro del plan |
| Agregar alimentos | Sí | Sí | No |
| Chat admin–entrenador–cliente | Sí | Sí, según vínculo | Sí, según vínculo |
| Solicitudes y amistades | Sí/consulta | Sí/consulta según flujo | Sí |
| Avatar/foto de perfil | Sí | Sí, propio | Sí, propio |
| Recuperación de contraseña | Sí | Sí | Sí |

## Guardarraíles científicos agregados
El sistema ahora rechaza dietas con una diferencia excesiva entre calorías declaradas y calorías derivadas de macronutrientes:

- proteína = 4 kcal/g
- carbohidrato = 4 kcal/g
- grasa = 9 kcal/g
- tolerancia operacional: máximo entre 250 kcal o 18% del total calórico

Esto no reemplaza valoración médica o nutricional, pero evita que entren al piloto planes evidentemente incoherentes, como dietas con calorías imposibles frente a sus macros.

## Checklist mínimo antes de invitar clientes

### 1. Entorno
- [ ] Backend desplegado y accesible por HTTPS.
- [ ] Frontend desplegado y apuntando al backend correcto.
- [ ] Base de datos limpia o con seed piloto controlado.
- [ ] Variables `.env` reales cargadas.
- [ ] CORS configurado solo para dominios reales.
- [ ] Correo SMTP validado para recuperación de contraseña.

### 2. Usuarios piloto
- [ ] 1 administrador.
- [ ] 2 entrenadores.
- [ ] 5 a 10 clientes reales o semirreales.
- [ ] Cada cliente asignado al entrenador correcto.
- [ ] Contraseñas temporales cambiadas en primer acceso.

### 3. Pruebas por rol
- [ ] Cliente no accede a `/sync`, finanzas, usuarios, asistente interno ni implementación aunque manipule la URL.
- [ ] Entrenador no ve clientes de otro entrenador.
- [ ] Admin puede ver y controlar todo.
- [ ] Cliente solo ve su dieta/rutina activa.
- [ ] Cliente puede actualizar perfil y avatar.

### 4. Flujo profesional
- [ ] Entrenador crea alimento nuevo.
- [ ] Entrenador crea dieta automática.
- [ ] Entrenador crea dieta manual.
- [ ] Entrenador edita dieta.
- [ ] Entrenador retira dieta.
- [ ] Entrenador crea plantilla de rutina.
- [ ] Entrenador asigna rutina.
- [ ] Entrenador edita rutina.
- [ ] Entrenador retira rutina.
- [ ] Cliente visualiza cambios sin ver herramientas internas.

### 5. Flujo social
- [ ] Cliente envía solicitud.
- [ ] Otro cliente acepta solicitud.
- [ ] Chat funciona solo cuando existe vínculo o permiso de rol.
- [ ] Admin puede conversar con entrenadores y clientes.
- [ ] Entrenador conversa con clientes asignados.

### 6. Recuperación y seguridad
- [ ] Solicitud de recuperación llega al correo.
- [ ] Token inválido o usado no permite cambio.
- [ ] Cambio de contraseña funciona autenticado.
- [ ] Sesión expirada obliga a iniciar sesión nuevamente.

## Criterio de aprobación del piloto
El piloto se considera listo cuando:

1. Los 28 tests backend pasan.
2. El build frontend pasa.
3. La prueba manual de 10 clientes no genera errores críticos.
4. Ningún rol ve herramientas ajenas.
5. Los entrenadores pueden gestionar dietas/rutinas/alimentos sin intervención técnica.
6. Los clientes pueden usar la app sin entender la parte interna del sistema.

## Recomendación de piloto
Duración sugerida: 7 a 14 días.

Grupo inicial:
- 1 admin operativo.
- 2 entrenadores.
- 5 clientes por entrenador.

No abrir todavía a todos los clientes del gimnasio hasta completar el primer ciclo de retroalimentación.
