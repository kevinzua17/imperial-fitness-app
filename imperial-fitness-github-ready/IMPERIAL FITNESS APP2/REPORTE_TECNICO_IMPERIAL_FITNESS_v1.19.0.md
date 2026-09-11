# Reporte técnico — Imperial Fitness v1.19.0

## Objetivo

Eliminar la dependencia del generador automático para los casos habituales de hipertrofia. El entrenador debe poder asignar una rutina clara, estable y repetible sin buscar ni reemplazar ejercicio por ejercicio.

## Biblioteca incorporada

| Audiencia | Principiante | Intermedio | Avanzado |
|---|---:|---:|---:|
| Mujer | Sí | Sí | Sí |
| Hombre | Sí | Sí | Sí |
| General | Sí | Sí | Sí |

Total: **9 plantillas únicas**.

### División femenina

- Lunes: pierna completa.
- Martes: espalda, bíceps y core.
- Miércoles: glúteos, abductores y femoral.
- Jueves: tríceps, hombros, bíceps y abdomen.
- Viernes: cuádriceps, femoral y glúteos.

### División masculina

- Lunes: pecho, hombro y tríceps.
- Martes: pierna completa.
- Miércoles: espalda, bíceps y abdomen.
- Jueves: pecho, hombro, tríceps y cardio.
- Viernes: pierna completa.

### División general

Cuatro días superior/inferior, con dos estímulos semanales para los grupos principales.

## Comportamiento de asignación

1. El administrador filtra por audiencia.
2. Abre una tarjeta compacta por nivel.
3. Revisa volumen, intensidad, progresión y días.
4. Carga la plantilla como borrador del cliente seleccionado.
5. El sistema enlaza cada ejercicio con el catálogo visual existente.
6. La rutina queda protegida.
7. El entrenador revisa limitaciones y ajusta la prescripción.
8. El botón existente “Guardar y enviar rutina” persiste y verifica la publicación.

No se publica silenciosamente al seleccionar la plantilla.

## Protección contra cambios accidentales

`structureLocked: true` bloquea los cambios estructurales. La protección se conserva en `payload_json` y vuelve a cargarse cuando el administrador o el cliente consulta la rutina.

Metadatos añadidos:

- `presetId`
- `presetVersion`
- `presetAudience`
- `structureLocked`
- `weeklyVolumeSummary`
- `progressionGuide`

Campos opcionales de prescripción por ejercicio:

- `prescribedLoad`
- `targetRir`

Los campos son compatibles con la estructura actual porque se almacenan dentro del JSON de la rutina.

## Progresión sin cambiar ejercicios

El nivel modifica principalmente:

- número de series;
- rango de repeticiones;
- descanso;
- cercanía al fallo mediante RIR;
- criterio de incremento de carga;
- frecuencia de descarga.

El entrenador puede actualizar estos valores desde “Ajustar carga e intensidad” aunque la estructura permanezca bloqueada.

## Seguridad

- No carga plantillas estándar si existe una limitación activa de severidad alta.
- Marca los ejercicios que entren en conflicto con otras limitaciones activas.
- Mantiene el envío final bajo control del entrenador.
- No modifica dietas, membresías, fechas, usuarios ni rutinas de otros clientes.
- No requiere migración nueva en Supabase.

## Archivos principales modificados

- `src/data/fixedHypertrophyRoutines.ts`
- `src/data/fixedHypertrophyRoutines.test.ts`
- `src/components/PersonalPlanView.tsx`
- `src/data/mockData.ts`
- `src/services/routineService.ts`
- `package.json`
- `package-lock.json`
- `backend/app/main.py`
- `public/service-worker.js`
