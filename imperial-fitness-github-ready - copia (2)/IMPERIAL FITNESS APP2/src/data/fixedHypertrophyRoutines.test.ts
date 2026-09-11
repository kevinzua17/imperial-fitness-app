import { describe, expect, it } from 'vitest';
import { FIXED_HYPERTROPHY_ROUTINES } from './fixedHypertrophyRoutines';

const names = FIXED_HYPERTROPHY_ROUTINES.map((routine) => routine.title);

describe('fixed hypertrophy routine library', () => {
  it('contains exactly nine unique master routines', () => {
    expect(FIXED_HYPERTROPHY_ROUTINES).toHaveLength(9);
    expect(new Set(names).size).toBe(9);
  });

  it('contains three levels for every audience', () => {
    for (const audience of ['Mujer', 'Hombre', 'General'] as const) {
      const routines = FIXED_HYPERTROPHY_ROUTINES.filter((routine) => routine.audience === audience);
      expect(routines.map((routine) => routine.level).sort()).toEqual(['Avanzado', 'Intermedio', 'Principiante']);
    }
  });

  it('preserves the requested five-day splits for women and men', () => {
    const women = FIXED_HYPERTROPHY_ROUTINES.find((routine) => routine.audience === 'Mujer' && routine.level === 'Principiante');
    const men = FIXED_HYPERTROPHY_ROUTINES.find((routine) => routine.audience === 'Hombre' && routine.level === 'Principiante');
    expect(women?.days.map((day) => day.day)).toEqual(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']);
    expect(men?.days.map((day) => day.day)).toEqual(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']);
    expect(women?.days[0].focus.toLowerCase()).toContain('pierna completa');
    expect(men?.days[0].focus.toLowerCase()).toContain('pecho');
  });

  it('keeps every program complete and progression-ready', () => {
    for (const routine of FIXED_HYPERTROPHY_ROUTINES) {
      expect(routine.days.length).toBe(routine.daysPerWeek);
      expect(routine.weeklyVolume.length).toBeGreaterThan(40);
      expect(routine.progressionGuide.length).toBeGreaterThan(40);
      for (const day of routine.days) {
        expect(day.exercises.length).toBeGreaterThanOrEqual(5);
        for (const exercise of day.exercises) {
          expect(exercise.sets).toBeGreaterThan(0);
          expect(exercise.reps.length).toBeGreaterThan(0);
          expect(exercise.rest.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
