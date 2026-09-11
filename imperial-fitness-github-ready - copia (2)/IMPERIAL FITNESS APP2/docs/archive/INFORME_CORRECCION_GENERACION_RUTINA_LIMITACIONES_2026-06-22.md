# Corrección: generación automática de rutina y Modo Cuidado Imperial

## Problema detectado

La pantalla de planes mostraba mensajes como:

- "Plantilla manual de rutina guardada en la base profesional."
- "Generación automática bloqueada: primero debe cargarse y confirmarse el estado de limitaciones del cliente."

La causa era que el generador automático de rutina estaba condicionado a que el módulo de limitaciones cargara en estado `ready`. Si la consulta tardaba, fallaba o no había limitaciones registradas pero el estado no se confirmaba, la generación quedaba bloqueada.

## Corrección aplicada

Se agregó una opción visible en **Modo Cuidado Imperial**:

- **Sin limitaciones activas**

Con este botón, el entrenador/admin puede confirmar que el cliente no tiene molestias, lesiones o limitaciones activas registradas. Al confirmarlo, el generador queda habilitado para crear la rutina automática.

## Lógica actual

1. Si hay limitaciones activas leves o moderadas, el generador filtra ejercicios incompatibles.
2. Si existe una limitación activa de severidad alta, la generación automática sigue bloqueada por seguridad.
3. Si no hay limitaciones activas, el entrenador puede confirmar "Sin limitaciones activas" y generar la rutina.
4. Si no se ha confirmado el estado del cliente, la app muestra una guía clara y no mensajes técnicos.

## Archivos modificados

- `src/components/PersonalPlanView.tsx`
- `src/components/ImperialCarePanel.tsx`

## SQL

No requiere SQL nuevo.

## Prueba recomendada

1. Entrar como admin o entrenador.
2. Ir a Plan personalizado.
3. Seleccionar un cliente.
4. En Modo Cuidado Imperial, si el cliente no tiene molestias, pulsar **Sin limitaciones activas**.
5. Presionar **Generar rutina asignada**.
6. Confirmar que la rutina se crea correctamente.

