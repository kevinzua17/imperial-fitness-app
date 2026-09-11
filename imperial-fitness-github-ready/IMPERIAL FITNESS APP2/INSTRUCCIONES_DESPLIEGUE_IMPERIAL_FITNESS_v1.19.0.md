# Instrucciones de despliegue — Imperial Fitness v1.19.0

## Qué incorpora esta versión

- Biblioteca de 9 rutinas maestras de hipertrofia.
- Tres niveles para mujer: principiante, intermedio y avanzado.
- Tres niveles para hombre: principiante, intermedio y avanzado.
- Tres niveles generales: principiante, intermedio y avanzado.
- Selección rápida por audiencia y nivel.
- Vista previa desplegable antes de cargar una plantilla.
- Estructura protegida contra reemplazos, eliminaciones, reordenamientos y regeneraciones accidentales.
- Editor permitido de series, repeticiones, descanso, carga objetivo, RIR e indicaciones.
- Persistencia del identificador, versión, audiencia y estado de bloqueo dentro del JSON de la rutina asignada.
- Caché PWA actualizada a `imperial-fitness-shell-v15`.

## Supabase

**No hay que ejecutar ninguna migración SQL nueva para v1.19.0.**

Las plantillas viven en el frontend y, al asignarse, se guardan mediante el mecanismo existente de rutinas asignadas. Los nuevos datos son campos opcionales dentro de `payload_json`, que ya es compatible con esta información.

No vuelvas a ejecutar `schema.sql`, `00_RUN_ALL_IN_SUPABASE.sql`, las migraciones 031/032/033 ni el seed por motivo de esta actualización.

## 1. Desplegar backend en Render

Sube la carpeta completa o conecta el repositorio actualizado. Conserva las variables de entorno actuales.

Comprueba:

```text
/health
```

Debe indicar:

```text
version: 1.19.0
```

Luego comprueba:

```text
/health/ready
```

Debe continuar en estado `ready`, con conexión a base de datos y las verificaciones de las versiones anteriores activas.

## 2. Desplegar frontend en Vercel

Despliega después de confirmar Render. Conserva la URL correcta del backend en las variables de Vercel.

La caché PWA cambió a `v15`. En teléfonos que sigan mostrando la interfaz anterior:

1. Cierra completamente la aplicación.
2. Ábrela nuevamente.
3. Si persiste, borra los datos del sitio o reinstala el acceso directo/PWA.

## 3. Prueba controlada

Usa primero un cliente de prueba.

1. Entra como administrador o entrenador.
2. Abre Planes y Rutinas.
3. Busca “Rutinas maestras de hipertrofia”.
4. Selecciona Mujer, Hombre o General.
5. Abre Principiante, Intermedio o Avanzado.
6. Pulsa “Cargar … para [cliente]”.
7. Verifica que diga “Plantilla fija protegida”.
8. Abre un ejercicio y usa “Ajustar carga e intensidad”.
9. Cambia solo un dato de prueba, como RIR o carga objetivo.
10. Pulsa el botón existente “Guardar y enviar rutina”.
11. Inicia sesión como el cliente y verifica días, ejercicios y ajuste realizado.

## Protección de estructura

Mientras la plantilla esté protegida, el sistema bloquea:

- agregar ejercicios;
- retirar ejercicios;
- cambiar el orden;
- regenerar o reemplazar ejercicios.

Sí permite modificar:

- series;
- repeticiones;
- descanso;
- carga objetivo;
- RIR objetivo;
- indicaciones del entrenador;
- título, objetivo y consejo general mediante el flujo existente.

Para cambiar ejercicios existe un botón explícito de desbloqueo con confirmación. Úsalo solo cuando una lesión, limitación, falta de equipo o criterio profesional lo justifique.

## Consideración clínica y deportiva

Las rutinas son puntos de partida para adultos sanos. Antes de asignarlas, revisa limitaciones, lesiones, dolor, embarazo, condiciones cardiovasculares, experiencia técnica y disponibilidad de equipos. La aplicación bloquea automáticamente la carga estándar cuando detecta una limitación activa de severidad alta y marca posibles conflictos para revisión.
