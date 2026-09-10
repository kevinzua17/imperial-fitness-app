import { describe, expect, it } from 'vitest';
import type { ClientProfile } from './mockData';
import type { ExerciseCatalogItem } from './exerciseCatalog';
import { generateImperialRoutine, isHypertrophyGymExercise } from './gymProgramming';

const client = {
  id: '77',
  name: 'Cliente prueba',
  role: 'client',
  injuries: '',
  weaknesses: '',
} as ClientProfile;

const exercise = (overrides: Partial<ExerciseCatalogItem> & Pick<ExerciseCatalogItem, 'id' | 'name' | 'primaryMuscle' | 'muscleGroups' | 'equipment'>): ExerciseCatalogItem => ({
  segment: 'superior',
  movement: 'push',
  level: 'todos',
  isActive: true,
  imageUrl: '/exercise.jpg',
  needsImageReview: false,
  ...overrides,
});

describe('generador muscular estricto de hipertrofia', () => {
  const openMachineChest = exercise({
    id: 'open-machine-chest',
    name: 'Press de Pecho en Máquina',
    primaryMuscle: 'pecho',
    muscleGroups: ['pecho', 'tríceps'],
    equipment: 'Máquina',
    mediaSource: 'free-exercise-db',
  });
  const openDumbbellChest = exercise({
    id: 'open-dumbbell-chest',
    name: 'Press Inclinado con Mancuernas',
    primaryMuscle: 'pecho',
    muscleGroups: ['pecho', 'tríceps'],
    equipment: 'Mancuernas',
    mediaSource: 'free-exercise-db',
  });
  const imperialMachineChest = exercise({
    id: 'imperial-machine-chest',
    name: 'Peck Deck Imperial',
    primaryMuscle: 'pecho',
    muscleGroups: ['pecho'],
    equipment: 'Máquina Peck Deck',
    mediaSource: 'imperial-fitness',
  });
  const misleadingBackExercise = exercise({
    id: 'open-lat-pulldown',
    name: 'Jalón al Pecho en Máquina',
    primaryMuscle: 'dorsales',
    muscleGroups: ['dorsales', 'espalda media', 'bíceps'],
    equipment: 'Máquina / polea',
    movement: 'pull',
    mediaSource: 'free-exercise-db',
  });

  it('no incluye espalda en un día definido exclusivamente como pecho', () => {
    const catalog = [misleadingBackExercise, openMachineChest, openDumbbellChest, imperialMachineChest];
    const routine = generateImperialRoutine({
      client,
      goal: 'hipertrofia',
      level: 'Intermedio',
      selectedDays: ['Lunes'],
      rotationKey: 123,
      exerciseCatalog: catalog,
      exerciseSource: 'all',
      customWeeklyPlan: [{ day: 'Lunes', muscleTargets: ['pecho'] }],
    });

    const selectedIds = routine.days[0].exercises.map(item => item.exerciseId).filter(Boolean);
    expect(selectedIds).not.toContain(misleadingBackExercise.id);
    expect(selectedIds.length).toBeGreaterThan(0);
  });

  it('prioriza el press en máquina frente a opciones menos prioritarias', () => {
    const routine = generateImperialRoutine({
      client,
      goal: 'hipertrofia',
      level: 'Intermedio',
      selectedDays: ['Lunes'],
      rotationKey: 456,
      exerciseCatalog: [imperialMachineChest, openDumbbellChest, openMachineChest],
      exerciseSource: 'all',
      customWeeklyPlan: [{ day: 'Lunes', muscleTargets: ['pecho'] }],
    });

    const firstWorkingExercise = routine.days[0].exercises.find(item => Boolean(item.exerciseId));
    expect(firstWorkingExercise?.exerciseId).toBe(openMachineChest.id);
    expect(routine.days[0].exercises.filter(item => item.block === 'Calentamiento')).toHaveLength(3);
  });

  it('excluye calistenia, bandas, cardio y ejercicios infantiles aunque tengan músculo válido', () => {
    const rejected = [
      exercise({ id: 'kids-chest', name: 'Press divertido para niños', primaryMuscle: 'pecho', muscleGroups: ['pecho'], equipment: 'Máquina' }),
      exercise({ id: 'senior-chest', name: 'Press terapéutico geriátrico para ancianas', primaryMuscle: 'pecho', muscleGroups: ['pecho'], equipment: 'Máquina' }),
      exercise({ id: 'band-chest', name: 'Press con banda', primaryMuscle: 'pecho', muscleGroups: ['pecho'], equipment: 'Banda elástica' }),
      exercise({ id: 'bodyweight-chest', name: 'Flexión de pecho', primaryMuscle: 'pecho', muscleGroups: ['pecho'], equipment: 'Peso corporal' }),
      exercise({ id: 'cardio-machine', name: 'Caminata en máquina', primaryMuscle: 'cardio', muscleGroups: ['cardio'], equipment: 'Máquina', segment: 'cardio', movement: 'cardio' }),
    ];

    rejected.forEach(item => expect(isHypertrophyGymExercise(item)).toBe(false));
    expect(isHypertrophyGymExercise(openMachineChest)).toBe(true);
    expect(isHypertrophyGymExercise(openDumbbellChest)).toBe(true);
  });

  it('un día de glúteo no usa un ejercicio cuyo músculo principal sea abductor', () => {
    const glute = exercise({
      id: 'hip-thrust-dumbbell',
      name: 'Hip Thrust con Mancuerna',
      primaryMuscle: 'glúteo',
      muscleGroups: ['glúteo mayor'],
      equipment: 'Banco / mancuerna',
      segment: 'inferior',
      movement: 'hinge',
    });
    const abductor = exercise({
      id: 'abductor-machine',
      name: 'Abductor en Máquina',
      primaryMuscle: 'abductor',
      muscleGroups: ['abductor', 'glúteo medio'],
      equipment: 'Máquina abductora',
      segment: 'inferior',
      movement: 'isolation',
    });

    const routine = generateImperialRoutine({
      client,
      goal: 'hipertrofia',
      level: 'Intermedio',
      selectedDays: ['Martes'],
      rotationKey: 789,
      exerciseCatalog: [abductor, glute],
      exerciseSource: 'all',
      customWeeklyPlan: [{ day: 'Martes', muscleTargets: ['gluteo'] }],
    });

    const selectedIds = routine.days[0].exercises.map(item => item.exerciseId).filter(Boolean);
    expect(selectedIds).toContain(glute.id);
    expect(selectedIds).not.toContain(abductor.id);
  });
});
