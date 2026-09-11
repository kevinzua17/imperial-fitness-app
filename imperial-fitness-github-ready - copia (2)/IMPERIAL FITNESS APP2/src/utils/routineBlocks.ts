export interface RoutineBlockSource {
  block?: string | null;
  name?: string | null;
  primaryMuscle?: string | null;
  muscleGroups?: string[] | null;
  segment?: string | null;
  movement?: string | null;
}

export const ROUTINE_BLOCK_OPTIONS = [
  'Calentamiento',
  'Pecho',
  'Espalda',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Cuádriceps',
  'Glúteos',
  'Femoral / Isquiotibiales',
  'Pantorrillas',
  'Core / Abdomen',
  'Cardio',
  'Movilidad',
  'Cuerpo completo',
  'Otro',
] as const;

export type RoutineBlockLabel = (typeof ROUTINE_BLOCK_OPTIONS)[number];

const normalize = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export function inferRoutineBlock(source: RoutineBlockSource): RoutineBlockLabel {
  const explicit = source.block?.trim();
  if (explicit && ROUTINE_BLOCK_OPTIONS.includes(explicit as RoutineBlockLabel)) {
    return explicit as RoutineBlockLabel;
  }

  const text = normalize([
    source.name,
    source.primaryMuscle,
    ...(source.muscleGroups || []),
    source.segment,
    source.movement,
  ].filter(Boolean).join(' '));

  if (/calent|aproximacion|activacion|entrada en calor/.test(text)) return 'Calentamiento';
  if (/movilidad|estiramiento dinamico|articular/.test(text)) return 'Movilidad';
  if (/pectoral|pecho|press banca|apertura|fly|peck/.test(text)) return 'Pecho';
  if (/dorsal|espalda|romboide|trapecio|remo|jalon|dominada|pullover/.test(text)) return 'Espalda';
  if (/hombro|deltoide|press militar|elevacion lateral|face pull/.test(text)) return 'Hombros';
  if (/triceps|extension de codo|press frances|fondos/.test(text)) return 'Tríceps';
  if (/biceps|curl|braquial/.test(text)) return 'Bíceps';
  if (/cuadriceps|extension de rodilla|sentadilla|prensa|hack/.test(text)) return 'Cuádriceps';
  if (/gluteo|hip thrust|patada|abductor|puente de cadera/.test(text)) return 'Glúteos';
  if (/isquio|femoral|peso muerto rumano|curl femoral/.test(text)) return 'Femoral / Isquiotibiales';
  if (/pantorrilla|gemelo|soleo|calf/.test(text)) return 'Pantorrillas';
  if (/abdomen|abdominal|core|oblicuo|crunch|plancha/.test(text)) return 'Core / Abdomen';
  if (/cardio|caminata|bicicleta|eliptica|remo ergometro|burpee|skipping/.test(text)) return 'Cardio';
  if (/full body|cuerpo completo|full_body/.test(text)) return 'Cuerpo completo';
  if (/inferior|pierna/.test(text)) return 'Cuádriceps';
  if (/superior/.test(text)) return 'Cuerpo completo';
  return 'Otro';
}

export function buildWarmupExercises(focus: string) {
  const focusText = focus.trim() || 'los grupos musculares del día';
  return [
    {
      name: 'Activación cardiovascular suave',
      sets: 1,
      reps: '5-8 min',
      rest: 'Sin pausa',
      equipment: 'Bicicleta, elíptica o caminata suave',
      segment: 'cardio',
      block: 'Calentamiento',
      muscleGroups: [],
      notes: `Eleva gradualmente la temperatura corporal sin fatigarte antes de trabajar ${focusText}. Mantén un ritmo conversacional.`,
    },
    {
      name: `Activación específica para ${focusText}`,
      sets: 1,
      reps: '15-20 repeticiones controladas',
      rest: '30-45s',
      equipment: 'Máquina o polea del grupo muscular con carga ligera',
      segment: 'full_body',
      block: 'Calentamiento',
      muscleGroups: [],
      notes: 'Activa el músculo que se trabajará usando una carga muy ligera. No llegues al fallo ni acumules fatiga antes de las series efectivas.',
    },
    {
      name: 'Series de aproximación del primer ejercicio',
      sets: 2,
      reps: '10 y 6-8',
      rest: '45-60s',
      equipment: 'Mismo equipo del primer ejercicio',
      segment: 'full_body',
      block: 'Calentamiento',
      muscleGroups: [],
      notes: 'Usa una carga ligera y luego una carga intermedia. No cuentes estas series como trabajo efectivo.',
    },
  ];
}
