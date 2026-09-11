import { describe, expect, it } from 'vitest';
import { getExerciseMedia, mediaKindLabel } from '../data/exerciseMedia';
import { mapOpenExerciseDbItem, translateOpenExerciseName } from './openExerciseDbService';

describe('openExerciseDbService', () => {
  it('convierte ejercicios abiertos a explicación en español sin instrucciones crudas en inglés', () => {
    const item = mapOpenExerciseDbItem({
      id: 'barbell-squat',
      name: 'Barbell Squat',
      force: 'push',
      level: 'beginner',
      equipment: 'barbell',
      primaryMuscles: ['quadriceps'],
      secondaryMuscles: ['glutes'],
      instructions: ['Stand with your feet shoulder-width apart.', 'Bend your knees and lower your hips.'],
      category: 'strength',
      images: ['barbell-squat/0.jpg', 'barbell-squat/1.jpg'],
    });

    expect(item).not.toBeNull();
    expect(item?.primaryMuscle).toBe('cuádriceps');
    expect(item?.equipment).toBe('Barra');
    expect(item?.coachingNotes).toContain('Trabaja principalmente cuádriceps');
    expect(item?.coachingNotes).not.toContain('Stand with');
    expect(item?.imageStartUrl).toContain('barbell-squat/0.jpg');
    expect(item?.imageEndUrl).toContain('barbell-squat/1.jpg');
  });

  it('muestra inicio y final cuando la base abierta trae dos imágenes', () => {
    const item = mapOpenExerciseDbItem({
      id: 'cable-row',
      name: 'Cable Row',
      force: 'pull',
      equipment: 'cable',
      primaryMuscles: ['middle back'],
      images: ['cable-row/0.jpg', 'cable-row/1.jpg'],
    });

    const media = getExerciseMedia(item!);
    expect(mediaKindLabel(media)).toBe('Inicio → final');
    expect(media.rangeSteps.map(step => step.phase)).toEqual(['Inicio', 'Recorrido', 'Final']);
    expect(media.tempoCue).toContain('Ritmo sugerido');
    expect(media.imageStartUrl).toContain('cable-row/0.jpg');
    expect(media.imageEndUrl).toContain('cable-row/1.jpg');
  });

  it('mantiene guía textual cuando solo existe una imagen', () => {
    const item = mapOpenExerciseDbItem({
      id: 'single-photo-row',
      name: 'Single Photo Row',
      force: 'pull',
      equipment: 'cable',
      primaryMuscles: ['middle back'],
      images: ['single-photo-row/0.jpg'],
    });

    const media = getExerciseMedia(item!);
    expect(mediaKindLabel(media)).toBe('Guía de rango');
    expect(media.rangeSteps.map(step => step.phase)).toEqual(['Inicio', 'Recorrido', 'Final']);
  });


  it('traduce nombres abiertos para que el generador no muestre ejercicios en inglés', () => {
    expect(translateOpenExerciseName('Barbell Full Squat', 'barbell')).toBe('Sentadilla Profunda con Barra');
    expect(translateOpenExerciseName('Cable Seated Row', 'cable')).toBe('Remo Sentado en Polea');
    expect(translateOpenExerciseName('Dumbbell Incline Bench Press', 'dumbbell')).toBe('Press de Banca Inclinado con Mancuernas');
  });
});
