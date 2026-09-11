import { describe, expect, it } from 'vitest';
import type { WorkoutRoutine } from '../types/domain';
import { calculateWeeklyVolume, progressionRecommendation } from './trainingVolume';

const routine: WorkoutRoutine = {
  id: 'r1',
  clientId: '1',
  clientName: 'Cliente',
  title: 'Rutina',
  objective: 'Hipertrofia',
  generatedDate: '2026-09-11',
  specialistAdvice: '',
  days: [
    { day: 'Lunes', focus: 'Pecho', exercises: [{ name: 'Press', sets: 4, reps: '8-12', muscleGroups: ['Pecho'] }] },
    { day: 'Jueves', focus: 'Pecho', exercises: [{ name: 'Press inclinado', sets: 4, reps: '8-12', muscleGroups: ['Pectoral'] }] },
  ],
};

describe('training volume audit', () => {
  it('aggregates weekly prescribed sets by normalized muscle group', () => {
    expect(calculateWeeklyVolume(routine)).toEqual([
      { muscle: 'Pecho', sets: 8, exerciseCount: 2, classification: 'target' },
    ]);
  });

  it('uses double progression before adding load', () => {
    expect(progressionRecommendation({ minReps: 8, maxReps: 12, completedReps: [10, 9, 9], rir: 2, loadKg: 50 })).toContain('Mantén');
    expect(progressionRecommendation({ minReps: 8, maxReps: 12, completedReps: [12, 12, 12], rir: 2, loadKg: 50 })).toContain('subida');
  });
});
