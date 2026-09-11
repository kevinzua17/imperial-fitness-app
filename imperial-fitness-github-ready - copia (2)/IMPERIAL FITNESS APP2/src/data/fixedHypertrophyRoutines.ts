import type { RoutineTemplate } from './foodDatabase';

export type FixedRoutineAudience = 'Mujer' | 'Hombre' | 'General';
export type FixedRoutineLevel = RoutineTemplate['level'];

export interface FixedHypertrophyTemplate extends RoutineTemplate {
  audience: FixedRoutineAudience;
  presetCode: string;
  version: string;
  weeklyVolume: string;
  intensityGuide: string;
  progressionGuide: string;
}

type LevelMap<T> = Record<FixedRoutineLevel, T>;

type ExerciseSeed = {
  name: string;
  sets: LevelMap<number>;
  reps: LevelMap<string> | string;
  rest: string;
  tempo?: string;
  notes: string;
};

type DaySeed = {
  day: string;
  focus: string;
  warmup: string;
  cooldown: string;
  exercises: ExerciseSeed[];
};

const levels: FixedRoutineLevel[] = ['Principiante', 'Intermedio', 'Avanzado'];
const sets = (principiante: number, intermedio: number, avanzado: number): LevelMap<number> => ({ Principiante: principiante, Intermedio: intermedio, Avanzado: avanzado });
const reps = (principiante: string, intermedio: string, avanzado: string): LevelMap<string> => ({ Principiante: principiante, Intermedio: intermedio, Avanzado: avanzado });

const intensityByLevel: Record<FixedRoutineLevel, string> = {
  Principiante: 'Trabajar normalmente a 3-2 RIR. No llegar al fallo; primero dominar técnica, recorrido y control.',
  Intermedio: 'Trabajar a 2-1 RIR. Cuando se complete el máximo de repeticiones con técnica estable, aumentar 2,5-5% la carga.',
  Avanzado: 'Compuestos a 2-1 RIR y aislamientos a 1-0 RIR solo en la última serie cuando la recuperación sea adecuada. Evitar el fallo repetido en ejercicios libres pesados.',
};

const progressionByLevel: Record<FixedRoutineLevel, string> = {
  Principiante: 'Doble progresión durante 6 semanas: mantener el peso hasta completar el rango alto en todas las series; luego aumentar la carga mínima disponible. Semana 7 de descarga con 30-40% menos series.',
  Intermedio: 'Bloques de 5 semanas de progresión y 1 semana de descarga. Sumar repeticiones antes de subir peso y conservar 1-2 repeticiones en reserva.',
  Avanzado: 'Bloques de 4-5 semanas con control de rendimiento. Subir carga, repeticiones o una serie únicamente cuando sueño, dolor muscular y rendimiento indiquen recuperación. Descargar 35-50% del volumen cuando caiga el desempeño.',
};

const womenDays: DaySeed[] = [
  {
    day: 'Lunes',
    focus: 'Pierna completa: cuádriceps, glúteos, femoral y pantorrilla',
    warmup: '5-8 min de bicicleta + movilidad de cadera, rodilla y tobillo + 2 series de aproximación de sentadilla.',
    cooldown: 'Caminata suave 4-5 min y respiración; estiramiento ligero sin forzar.',
    exercises: [
      { name: 'Sentadilla Libre', sets: sets(3, 4, 4), reps: reps('8-10', '6-10', '6-8'), rest: '120s', tempo: '3-1-1', notes: 'Profundidad que permita pelvis y columna estables. Mantener tensión continua.' },
      { name: 'Prensa 45 Grados', sets: sets(3, 4, 4), reps: reps('10-12', '8-12', '8-12'), rest: '90-120s', notes: 'No despegar la cadera del respaldo ni bloquear rodillas.' },
      { name: 'Peso Muerto Rumano con Mancuernas', sets: sets(3, 3, 4), reps: '8-12', rest: '120s', tempo: '3-1-1', notes: 'Desplazar cadera atrás y mantener las mancuernas cerca del cuerpo.' },
      { name: 'Extensión de Cuádriceps', sets: sets(2, 3, 3), reps: reps('12-15', '10-15', '10-15'), rest: '60-75s', notes: 'Extender con control y sostener 1 segundo arriba.' },
      { name: 'Curl Femoral Sentado', sets: sets(2, 3, 3), reps: reps('12-15', '10-15', '8-12'), rest: '75s', notes: 'Mantener la cadera apoyada y controlar la fase excéntrica.' },
      { name: 'Elevación de Talones en Máquina de Pie', sets: sets(3, 4, 4), reps: '10-15', rest: '60s', tempo: '2-1-2', notes: 'Recorrido completo y pausa arriba y abajo.' },
    ],
  },
  {
    day: 'Martes',
    focus: 'Espalda, bíceps y core',
    warmup: '5 min de remo o caminata + movilidad escapular + 2 series ligeras de jalón.',
    cooldown: 'Movilidad suave de dorsales, bíceps y columna torácica.',
    exercises: [
      { name: 'Jalón Al Pecho Agarre Ancho', sets: sets(3, 4, 4), reps: '8-12', rest: '90s', notes: 'Llevar los codos hacia abajo sin balancear el torso.' },
      { name: 'Remo Bajo', sets: sets(3, 4, 4), reps: '8-12', rest: '90s', notes: 'Pecho alto, retracción escapular y regreso controlado.' },
      { name: 'Remo con Mancuerna', sets: sets(2, 3, 3), reps: '10-12 por lado', rest: '75-90s', notes: 'Evitar rotar el tronco; dirigir el codo hacia la cadera.' },
      { name: 'Fly Posterior en Máquina', sets: sets(2, 2, 2), reps: '12-20', rest: '60s', notes: 'Priorizar deltoide posterior y control escapular.' },
      { name: 'Curl en Máquina Predicador', sets: sets(3, 3, 4), reps: '8-12', rest: '75s', notes: 'No despegar brazos del apoyo; extensión casi completa.' },
      { name: 'Curl Martillo de Pie', sets: sets(2, 2, 2), reps: '10-15', rest: '60-75s', notes: 'Muñeca neutra y codos inmóviles.' },
      { name: 'Encogimiento en Polea Alta', sets: sets(3, 3, 3), reps: '10-15', rest: '60s', notes: 'Flexionar el tronco con el abdomen, no tirar solo con los brazos.' },
      { name: 'Plancha Frontal', sets: sets(2, 2, 2), reps: reps('25-35s', '35-50s', '45-60s'), rest: '45-60s', notes: 'Glúteos y abdomen activos, columna neutra.' },
    ],
  },
  {
    day: 'Miércoles',
    focus: 'Glúteos, abductores y femoral',
    warmup: '5-8 min de bicicleta + activación de glúteos + aproximaciones progresivas de hip thrust.',
    cooldown: 'Caminata suave y movilidad ligera de cadera e isquiotibiales.',
    exercises: [
      { name: 'Hip Thrust con Mancuerna', sets: sets(4, 4, 4), reps: reps('10-12', '8-12', '6-10'), rest: '120s', notes: 'Pausa de 1 segundo arriba sin hiperextender la zona lumbar.' },
      { name: 'Peso Muerto Rumano con Mancuernas', sets: sets(3, 4, 4), reps: '8-12', rest: '120s', tempo: '3-1-1', notes: 'Buscar estiramiento de femoral conservando la espalda neutra.' },
      { name: 'Curl Femoral Sentado', sets: sets(3, 4, 4), reps: '10-15', rest: '75-90s', notes: 'Controlar el retorno durante 2-3 segundos.' },
      { name: 'Patada de Glúteo en Polea', sets: sets(2, 3, 3), reps: '12-15 por lado', rest: '60s', notes: 'Evitar girar la pelvis; extensión de cadera controlada.' },
      { name: 'Abducción de Cadera en Polea', sets: sets(2, 3, 3), reps: '15-20 por lado', rest: '45-60s', notes: 'No inclinar el tronco; pausa breve al separar la pierna.' },
    ],
  },
  {
    day: 'Jueves',
    focus: 'Tríceps, hombros, bíceps y abdomen',
    warmup: '5 min de cardio suave + movilidad de hombro y codo + aproximaciones de press militar.',
    cooldown: 'Movilidad suave de hombros y brazos; respiración controlada.',
    exercises: [
      { name: 'Press Militar en Máquina', sets: sets(3, 4, 4), reps: reps('8-12', '6-10', '6-10'), rest: '90-120s', notes: 'Mantener abdomen activo y no elevar hombros hacia las orejas.' },
      { name: 'Elevaciones Laterales', sets: sets(3, 3, 4), reps: '12-20', rest: '60s', notes: 'Subir hasta línea de hombros con control, sin impulso.' },
      { name: 'Fly para Posterior', sets: sets(2, 2, 2), reps: '12-20', rest: '60s', notes: 'Separar con deltoide posterior y controlar la vuelta.' },
      { name: 'Extensión Tríceps en Polea', sets: sets(3, 4, 4), reps: '10-15', rest: '60-75s', notes: 'Codos pegados al cuerpo y extensión completa.' },
      { name: 'Extensión Por Encima en Polea', sets: sets(2, 2, 2), reps: '10-15', rest: '75s', notes: 'Mantener brazos estables y sentir la cabeza larga del tríceps.' },
      { name: 'Curl en Polea Baja', sets: sets(3, 4, 4), reps: '8-12', rest: '75s', notes: 'Evitar balanceo y controlar la extensión.' },
      { name: 'Curl Banco Inclinado', sets: sets(2, 2, 2), reps: '10-15', rest: '60-75s', notes: 'Hombros atrás y codos quietos.' },
      { name: 'Elevación de Piernas Acostado', sets: sets(2, 2, 2), reps: '10-15', rest: '60s', notes: 'Mantener la zona lumbar controlada.' },
    ],
  },
  {
    day: 'Viernes',
    focus: 'Cuádriceps, femoral y glúteos',
    warmup: '5-8 min de bicicleta + movilidad de tren inferior + aproximaciones de hack o prensa.',
    cooldown: 'Caminata suave y movilidad ligera de cadera, rodilla y tobillo.',
    exercises: [
      { name: 'Hacka 45 Grados', sets: sets(3, 4, 4), reps: reps('10-12', '8-12', '6-10'), rest: '120s', notes: 'Controlar profundidad y mantener espalda apoyada.' },
      { name: 'Prensa 45 Grados', sets: sets(2, 3, 3), reps: '10-15', rest: '90-120s', notes: 'Recorrido estable y sin rebotes.' },
      { name: 'Extensión de Cuádriceps', sets: sets(2, 3, 3), reps: '12-15', rest: '60-75s', notes: 'Pausa de 1 segundo en contracción.' },
      { name: 'Curl Femoral Sentado', sets: sets(3, 4, 4), reps: '8-12', rest: '75-90s', notes: 'No perder contacto con el asiento.' },
      { name: 'Hip Thrust con Mancuerna', sets: sets(3, 4, 4), reps: '8-12', rest: '120s', notes: 'Subida potente, pausa arriba y bajada controlada.' },
      { name: 'Sancadas con Mancuernas', sets: sets(2, 3, 3), reps: '10-12 por pierna', rest: '90s', notes: 'Paso estable y rodilla alineada con el pie.' },
    ],
  },
];

const menDays: DaySeed[] = [
  {
    day: 'Lunes',
    focus: 'Pecho, hombro y tríceps',
    warmup: '5 min de cardio suave + movilidad escapular + aproximaciones de press de pecho.',
    cooldown: 'Movilidad suave de pectoral, hombro y tríceps.',
    exercises: [
      { name: 'Press Hammer de Pecho', sets: sets(3, 4, 4), reps: reps('8-12', '6-10', '6-8'), rest: '120s', notes: 'Escápulas estables y recorrido controlado.' },
      { name: 'Press Inclinado con Mancuernas', sets: sets(3, 4, 4), reps: '8-12', rest: '120s', notes: 'Banco a 25-35 grados y antebrazos verticales.' },
      { name: 'Fly en Máquina', sets: sets(2, 2, 2), reps: '10-15', rest: '75s', notes: 'Estirar sin perder estabilidad del hombro.' },
      { name: 'Press Militar en Máquina', sets: sets(3, 4, 4), reps: '8-12', rest: '90-120s', notes: 'Abdomen activo y trayectoria controlada.' },
      { name: 'Elevaciones Laterales', sets: sets(3, 3, 3), reps: '12-20', rest: '60s', notes: 'Evitar impulso y mantener tensión en deltoide medio.' },
      { name: 'Extensión Tríceps en Polea', sets: sets(3, 4, 4), reps: '10-15', rest: '60-75s', notes: 'Codos inmóviles y extensión completa.' },
      { name: 'Extensión Por Encima en Polea', sets: sets(2, 2, 2), reps: '10-15', rest: '75s', notes: 'Trabajar la cabeza larga del tríceps con control.' },
    ],
  },
  {
    day: 'Martes',
    focus: 'Pierna completa',
    warmup: '5-8 min de bicicleta + movilidad de cadera, rodilla y tobillo + aproximaciones de sentadilla.',
    cooldown: 'Caminata suave y movilidad ligera de tren inferior.',
    exercises: [
      { name: 'Sentadilla Libre', sets: sets(3, 4, 4), reps: reps('8-10', '6-10', '5-8'), rest: '120-150s', notes: 'Técnica estable y profundidad individual segura.' },
      { name: 'Prensa 45 Grados', sets: sets(3, 4, 4), reps: '8-12', rest: '120s', notes: 'No bloquear rodillas ni despegar la pelvis.' },
      { name: 'Peso Muerto Rumano con Mancuernas', sets: sets(3, 4, 4), reps: '8-12', rest: '120s', notes: 'Cadera atrás, espalda neutra y control excéntrico.' },
      { name: 'Extensión de Cuádriceps', sets: sets(2, 3, 3), reps: '10-15', rest: '60-75s', notes: 'Pausa en contracción.' },
      { name: 'Curl Femoral Sentado', sets: sets(2, 3, 3), reps: '10-15', rest: '75s', notes: 'Controlar el retorno y mantener la cadera apoyada.' },
      { name: 'Elevación de Talones en Máquina de Pie', sets: sets(3, 4, 4), reps: '10-15', rest: '60s', notes: 'Recorrido completo y pausa en ambos extremos.' },
    ],
  },
  {
    day: 'Miércoles',
    focus: 'Espalda, bíceps y abdomen',
    warmup: '5 min de remo + movilidad escapular + aproximaciones de jalón y remo.',
    cooldown: 'Movilidad suave de dorsal, bíceps y columna torácica.',
    exercises: [
      { name: 'Jalón Al Pecho Agarre Ancho', sets: sets(3, 3, 3), reps: '8-12', rest: '90s', notes: 'Codos hacia abajo y torso estable.' },
      { name: 'Remo Barra T en Máquina', sets: sets(3, 4, 4), reps: reps('8-12', '6-10', '6-10'), rest: '120s', notes: 'Pecho apoyado cuando sea posible y retracción escapular.' },
      { name: 'Remo Bajo', sets: sets(3, 3, 3), reps: '8-12', rest: '90s', notes: 'No balancear el torso.' },
      { name: 'Pullover en Polea', sets: sets(2, 2, 2), reps: '10-15', rest: '75s', notes: 'Mantener brazos casi extendidos y sentir dorsales.' },
      { name: 'Fly Posterior en Máquina', sets: sets(2, 2, 2), reps: '12-20', rest: '60s', notes: 'Controlar la fase excéntrica.' },
      { name: 'Curl en Máquina Predicador', sets: sets(3, 3, 3), reps: '8-12', rest: '75s', notes: 'Sin despegar los brazos del apoyo.' },
      { name: 'Curl Martillo de Pie', sets: sets(2, 3, 3), reps: '10-15', rest: '60-75s', notes: 'Codos fijos y muñeca neutra.' },
      { name: 'Encogimiento en Polea Alta', sets: sets(3, 3, 3), reps: '10-15', rest: '60s', notes: 'Flexionar el tronco con el abdomen.' },
      { name: 'Elevación de Piernas Acostado', sets: sets(2, 3, 3), reps: '10-15', rest: '60s', notes: 'Evitar arquear la zona lumbar.' },
    ],
  },
  {
    day: 'Jueves',
    focus: 'Pecho, hombro, tríceps y cardio',
    warmup: '5 min de caminata + movilidad de hombro + aproximaciones de press.',
    cooldown: 'Cardio programado al final y movilidad suave de tren superior.',
    exercises: [
      { name: 'Press Banca con Mancuernas', sets: sets(3, 4, 4), reps: '8-12', rest: '120s', notes: 'Escápulas retraídas y pies firmes.' },
      { name: 'Cruce en Polea Media', sets: sets(2, 3, 3), reps: '10-15', rest: '75s', notes: 'Mantener tensión continua en pectoral.' },
      { name: 'Press Militar con Mancuernas', sets: sets(3, 4, 4), reps: '8-12', rest: '90-120s', notes: 'No hiperextender la zona lumbar.' },
      { name: 'Elevación Lateral Unilateral', sets: sets(3, 4, 4), reps: '12-20 por lado', rest: '60s', notes: 'Controlar subida y bajada.' },
      { name: 'Press Francés Acostado con Barra', sets: sets(3, 4, 4), reps: '8-12', rest: '75-90s', notes: 'Codos estables y descenso controlado.' },
      { name: 'Jalón de Tríceps en Polea', sets: sets(2, 3, 3), reps: '10-15', rest: '60s', notes: 'Bloquear el brazo junto al torso.' },
      { name: 'Bicicleta Estática', sets: sets(1, 1, 1), reps: reps('15-20 min zona 2', '20-25 min zona 2', '20-30 min zona 2'), rest: 'Continuo', notes: 'Cardio posterior a la fuerza, ritmo sostenible y sin interferir con la recuperación de piernas.' },
    ],
  },
  {
    day: 'Viernes',
    focus: 'Pierna completa',
    warmup: '5-8 min de bicicleta + movilidad de tren inferior + aproximaciones de hack.',
    cooldown: 'Caminata suave y movilidad ligera de cadera y tobillo.',
    exercises: [
      { name: 'Hacka 45 Grados', sets: sets(3, 4, 4), reps: reps('8-12', '6-10', '6-10'), rest: '120s', notes: 'Espalda apoyada y profundidad controlada.' },
      { name: 'Sentadilla Búlgara con Mancuernas', sets: sets(2, 3, 3), reps: '8-12 por pierna', rest: '90s', notes: 'Estabilidad primero; no apresurar la progresión de carga.' },
      { name: 'Peso Muerto Rumano con Mancuernas', sets: sets(3, 4, 4), reps: '8-12', rest: '120s', notes: 'Tensión constante en femoral y glúteo.' },
      { name: 'Curl Femoral Sentado', sets: sets(3, 4, 4), reps: '10-15', rest: '75-90s', notes: 'Controlar la fase excéntrica.' },
      { name: 'Extensión de Cuádriceps', sets: sets(2, 3, 3), reps: '10-15', rest: '60-75s', notes: 'Pausa arriba sin rebotes.' },
      { name: 'Elevación de Talones Sentado con Barra', sets: sets(3, 4, 4), reps: '12-20', rest: '60s', notes: 'Recorrido completo y pausa arriba.' },
    ],
  },
];

const generalDays: DaySeed[] = [
  {
    day: 'Lunes',
    focus: 'Tren inferior A: cuádriceps y glúteos',
    warmup: '5-8 min de bicicleta + movilidad de cadera, rodilla y tobillo.',
    cooldown: 'Caminata suave y movilidad ligera.',
    exercises: [
      { name: 'Sentadilla Libre', sets: sets(3, 4, 4), reps: reps('8-10', '6-10', '5-8'), rest: '120-150s', notes: 'Técnica estable y profundidad individual.' },
      { name: 'Prensa 45 Grados', sets: sets(3, 4, 4), reps: '8-12', rest: '120s', notes: 'Sin rebotes ni bloqueo de rodilla.' },
      { name: 'Sentadilla Búlgara con Mancuernas', sets: sets(2, 3, 3), reps: '8-12 por pierna', rest: '90s', notes: 'Mantener equilibrio y alineación.' },
      { name: 'Extensión de Cuádriceps', sets: sets(2, 3, 3), reps: '10-15', rest: '60-75s', notes: 'Pausa de 1 segundo arriba.' },
      { name: 'Hip Thrust con Mancuerna', sets: sets(3, 4, 4), reps: '8-12', rest: '120s', notes: 'Pausa arriba sin hiperextender la espalda.' },
      { name: 'Elevación de Talones en Máquina de Pie', sets: sets(3, 4, 4), reps: '10-15', rest: '60s', notes: 'Recorrido completo.' },
    ],
  },
  {
    day: 'Martes',
    focus: 'Tren superior A: pecho, espalda y hombros',
    warmup: '5 min de cardio suave + movilidad escapular y de hombro.',
    cooldown: 'Movilidad suave de tren superior.',
    exercises: [
      { name: 'Press Hammer de Pecho', sets: sets(3, 4, 4), reps: '8-12', rest: '120s', notes: 'Escápulas estables.' },
      { name: 'Jalón Al Pecho Agarre Ancho', sets: sets(3, 4, 4), reps: '8-12', rest: '90s', notes: 'Codos hacia abajo.' },
      { name: 'Remo Bajo', sets: sets(3, 4, 4), reps: '8-12', rest: '90s', notes: 'Torso estable.' },
      { name: 'Press Militar en Máquina', sets: sets(2, 3, 3), reps: '8-12', rest: '90s', notes: 'Abdomen activo.' },
      { name: 'Elevaciones Laterales', sets: sets(2, 3, 3), reps: '12-20', rest: '60s', notes: 'Sin impulso.' },
      { name: 'Extensión Tríceps en Polea', sets: sets(2, 3, 3), reps: '10-15', rest: '60s', notes: 'Codos inmóviles.' },
      { name: 'Curl en Polea Baja', sets: sets(2, 3, 3), reps: '10-15', rest: '60s', notes: 'Controlar extensión.' },
    ],
  },
  {
    day: 'Jueves',
    focus: 'Tren inferior B: femoral y glúteos',
    warmup: '5-8 min de bicicleta + movilidad de cadera + aproximaciones de peso muerto rumano.',
    cooldown: 'Caminata suave y movilidad ligera de femoral y cadera.',
    exercises: [
      { name: 'Peso Muerto Rumano con Mancuernas', sets: sets(3, 4, 4), reps: '8-12', rest: '120s', notes: 'Cadera atrás y espalda neutra.' },
      { name: 'Hacka 45 Grados', sets: sets(3, 4, 4), reps: '8-12', rest: '120s', notes: 'Profundidad controlada.' },
      { name: 'Curl Femoral Sentado', sets: sets(3, 4, 4), reps: '10-15', rest: '75-90s', notes: 'Control excéntrico.' },
      { name: 'Hip Thrust con Mancuerna', sets: sets(3, 4, 4), reps: '8-12', rest: '120s', notes: 'Pausa arriba.' },
      { name: 'Patada de Glúteo en Polea', sets: sets(2, 3, 3), reps: '12-15 por lado', rest: '60s', notes: 'Pelvis estable.' },
      { name: 'Elevación de Talones Sentado con Barra', sets: sets(3, 4, 4), reps: '12-20', rest: '60s', notes: 'Pausa arriba.' },
    ],
  },
  {
    day: 'Viernes',
    focus: 'Tren superior B: espalda, pecho, brazos y core',
    warmup: '5 min de cardio suave + movilidad escapular + aproximaciones de remo.',
    cooldown: 'Movilidad suave y respiración controlada.',
    exercises: [
      { name: 'Remo Barra T en Máquina', sets: sets(3, 4, 4), reps: '8-12', rest: '120s', notes: 'Retracción escapular y control.' },
      { name: 'Press Inclinado con Mancuernas', sets: sets(3, 4, 4), reps: '8-12', rest: '120s', notes: 'Banco a 25-35 grados.' },
      { name: 'Pullover en Polea', sets: sets(2, 3, 3), reps: '10-15', rest: '75s', notes: 'Brazos casi extendidos.' },
      { name: 'Fly Posterior en Máquina', sets: sets(2, 3, 3), reps: '12-20', rest: '60s', notes: 'Control escapular.' },
      { name: 'Curl en Máquina Predicador', sets: sets(2, 3, 3), reps: '8-12', rest: '75s', notes: 'Sin despegar brazos.' },
      { name: 'Extensión Por Encima en Polea', sets: sets(2, 3, 3), reps: '10-15', rest: '75s', notes: 'Codos estables.' },
      { name: 'Encogimiento en Polea Alta', sets: sets(2, 3, 3), reps: '10-15', rest: '60s', notes: 'Flexionar con el abdomen.' },
    ],
  },
];

const volumeByAudience: Record<FixedRoutineAudience, Record<FixedRoutineLevel, string>> = {
  Mujer: {
    Principiante: 'Volumen semanal orientativo: cuádriceps 10-12, glúteos 12-14, femoral 10-12, espalda 8-10, hombros 7-9, bíceps 6-8, tríceps 5-7 y core 6-8 series equivalentes.',
    Intermedio: 'Volumen semanal orientativo: cuádriceps 12-16, glúteos 14-18, femoral 12-15, espalda 10-13, hombros 10-13, bíceps 8-10, tríceps 7-9 y core 8-10 series equivalentes.',
    Avanzado: 'Volumen semanal orientativo: cuádriceps 14-18, glúteos 16-20, femoral 14-18, espalda 12-16, hombros 12-16, bíceps 10-12, tríceps 8-11 y core 9-12 series equivalentes.',
  },
  Hombre: {
    Principiante: 'Volumen semanal orientativo: pecho 10-12, espalda 10-12, hombros 8-11, tríceps 7-9, bíceps 5-7, cuádriceps 10-12, femoral 8-10, glúteos 8-10 y pantorrillas 6 series equivalentes.',
    Intermedio: 'Volumen semanal orientativo: pecho 12-16, espalda 13-16, hombros 11-15, tríceps 9-12, bíceps 7-10, cuádriceps 12-16, femoral 11-14, glúteos 10-14 y pantorrillas 8 series equivalentes.',
    Avanzado: 'Volumen semanal orientativo: pecho 14-18, espalda 15-19, hombros 13-18, tríceps 11-15, bíceps 9-12, cuádriceps 14-18, femoral 13-16, glúteos 12-16 y pantorrillas 10 series equivalentes.',
  },
  General: {
    Principiante: 'Volumen semanal orientativo: 8-12 series equivalentes por grupo muscular principal, distribuidas en dos estímulos semanales.',
    Intermedio: 'Volumen semanal orientativo: 10-16 series equivalentes por grupo muscular principal, distribuidas en dos estímulos semanales.',
    Avanzado: 'Volumen semanal orientativo: 12-18 series equivalentes por grupo muscular principal, con ajustes según recuperación y progreso.',
  },
};

const titleByAudience: Record<FixedRoutineAudience, string> = {
  Mujer: 'Hipertrofia Women',
  Hombre: 'Hipertrofia Men',
  General: 'Hipertrofia General',
};

const descriptionByAudience: Record<FixedRoutineAudience, string> = {
  Mujer: 'Programa fijo de cinco días con prioridad de tren inferior, glúteos y femoral, y trabajo suficiente de espalda, hombros, brazos y core.',
  Hombre: 'Programa fijo de cinco días con doble estímulo de empuje y pierna, una sesión concentrada de espalda y trabajo complementario de brazos, core y cardio.',
  General: 'Programa fijo superior/inferior de cuatro días, equilibrado y fácil de asignar cuando no se desea priorizar una división por audiencia.',
};

const rationaleByAudience: Record<FixedRoutineAudience, string> = {
  Mujer: 'La estructura conserva los mismos ejercicios base para facilitar técnica y sobrecarga progresiva. El nivel modifica principalmente series, rango de repeticiones y cercanía al fallo.',
  Hombre: 'La estructura mantiene ejercicios compuestos estables y aislamientos de alta relación estímulo-fatiga. El progreso se realiza con carga, repeticiones y RIR, no cambiando ejercicios cada semana.',
  General: 'La división superior/inferior distribuye el volumen en dos estímulos por grupo muscular y permite progresar sin sesiones excesivamente largas.',
};

const daysByAudience: Record<FixedRoutineAudience, DaySeed[]> = {
  Mujer: womenDays,
  Hombre: menDays,
  General: generalDays,
};

const buildTemplate = (audience: FixedRoutineAudience, level: FixedRoutineLevel): FixedHypertrophyTemplate => {
  const codeAudience = audience === 'Mujer' ? 'women' : audience === 'Hombre' ? 'men' : 'general';
  const levelCode = level.toLowerCase();
  return {
    id: `fixed-hypertrophy-${codeAudience}-${levelCode}`,
    presetCode: `HYP-${codeAudience.toUpperCase()}-${levelCode.toUpperCase()}`,
    version: '1.0',
    audience,
    title: `${titleByAudience[audience]} · ${level}`,
    targetGoal: `Hipertrofia ${audience}`,
    level,
    daysPerWeek: daysByAudience[audience].length,
    description: descriptionByAudience[audience],
    trainerRationale: rationaleByAudience[audience],
    weeklyVolume: volumeByAudience[audience][level],
    intensityGuide: intensityByLevel[level],
    progressionGuide: progressionByLevel[level],
    days: daysByAudience[audience].map((day) => ({
      day: day.day,
      focus: day.focus,
      warmup: day.warmup,
      cooldown: day.cooldown,
      exercises: day.exercises.map((exercise) => ({
        name: exercise.name,
        sets: exercise.sets[level],
        reps: typeof exercise.reps === 'string' ? exercise.reps : exercise.reps[level],
        rest: exercise.rest,
        tempo: exercise.tempo,
        notes: `${exercise.notes} ${intensityByLevel[level]}`,
      })),
    })),
  };
};

export const FIXED_HYPERTROPHY_ROUTINES: FixedHypertrophyTemplate[] = (['Mujer', 'Hombre', 'General'] as FixedRoutineAudience[])
  .flatMap((audience) => levels.map((level) => buildTemplate(audience, level)));
