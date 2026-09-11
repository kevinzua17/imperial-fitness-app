# Informe - Técnicas de intensidad en rutinas Imperial Fitness

## Objetivo
Se integraron técnicas de intensidad como métodos aplicables a ejercicios específicos dentro de la rutina, no como rutinas independientes.

## Técnicas incorporadas

### Sobrecarga
- Lastre

### Extensión de serie
- Drop set
- Rest-pause
- Myo-reps

### Densidad / ahorro de tiempo
- Superseries antagonistas
- Series compuestas
- Triseries
- Series gigantes

### Repeticiones modificadas
- Repeticiones parciales
- Excéntricas acentuadas

## Modos nuevos de aplicación
En el generador de rutinas se agregó el selector **Técnicas** con estas opciones:

- Sin técnicas intensivas
- Automático inteligente
- Estrés metabólico
- Ahorro de tiempo
- Sobrecarga / fuerza

## Lógica aplicada
Las técnicas se asignan de forma selectiva considerando:

- Nivel del cliente
- Objetivo del plan
- Modo de rutina elegido
- Tipo de ejercicio
- Grupo muscular
- Equipo usado
- Riesgo técnico del ejercicio
- Limitaciones activas del cliente

## Reglas de seguridad
- Principiantes: solo excéntricas controladas y con baja frecuencia.
- Salud/readaptación: no se aplican técnicas agresivas.
- Drop sets, myo-reps y parciales: principalmente en máquinas, poleas o aislamiento.
- Lastre: solo en ejercicios corporales dominados y nivel avanzado.
- Series gigantes: solo avanzado y en bloques compatibles.
- Ejercicios libres pesados de alto riesgo no reciben técnicas intensivas automáticas.

## Experiencia visual
En la rutina activa, cada ejercicio que tenga una técnica muestra:

- Nombre de la técnica
- Categoría
- Cómo ejecutarla
- Precaución para el cliente

## Archivos modificados
- src/data/gymProgramming.ts
- src/data/mockData.ts
- src/components/PersonalPlanView.tsx

## SQL
No se requiere SQL nuevo.

## Validación
Se intentó ejecutar typecheck, pero el entorno no tenía instaladas las dependencias de Node. Antes de producción se debe correr:

```bash
npm ci
npm run typecheck
npm run build
```
