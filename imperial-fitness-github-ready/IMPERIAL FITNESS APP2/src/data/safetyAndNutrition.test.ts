import { describe, expect, it } from 'vitest';
import type { ClientProfile, DietMealItem } from './mockData';
import type { FoodItem } from './foodDatabase';
import { EXERCISE_CATALOG } from './exerciseCatalog';
import { exerciseConflictsWithLimitations } from './gymProgramming';
import { calculateMacroAwareEquivalence } from './nutritionEquivalence';

describe('routine safety rules', () => {
  const client = { id: '1', injuries: '', weaknesses: '' } as ClientProfile;

  it('excludes a squat when an active moderate knee limitation exists', () => {
    const squat = EXERCISE_CATALOG.find(item => item.name.toLowerCase().includes('sentadilla libre'));
    expect(squat).toBeTruthy();
    expect(exerciseConflictsWithLimitations(squat!, client, [
      { bodyArea: 'rodilla', severity: 'moderada', status: 'active' },
    ])).toBe(true);
  });

  it('ignores resolved limitations', () => {
    const squat = EXERCISE_CATALOG.find(item => item.name.toLowerCase().includes('sentadilla libre'));
    expect(squat).toBeTruthy();
    expect(exerciseConflictsWithLimitations(squat!, client, [
      { bodyArea: 'rodilla', severity: 'moderada', status: 'resolved' },
    ])).toBe(false);
  });
});

describe('macro-aware food equivalence', () => {
  const original: DietMealItem = {
    id: 'rice', originalName: 'Arroz', currentName: 'Arroz', amountGrams: 100,
    baseCalsPer100g: 130, baseProteinPer100g: 2.7, baseCarbsPer100g: 28, baseFatPer100g: 0.3,
    category: 'carb',
  };
  const substitute = {
    id: 2, name: 'Papa cocida', category: 'carb', calsPer100g: 87,
    proteinPer100g: 1.9, carbsPer100g: 20.1, fatPer100g: 0.1,
    fiberPer100g: 1.8, clientNote: '', trainerNote: '',
  } as FoodItem;

  it('returns a bounded amount and transparent deltas for all macros', () => {
    const result = calculateMacroAwareEquivalence(original, substitute);
    expect(result.grams).toBeGreaterThanOrEqual(5);
    expect(result.grams).toBeLessThanOrEqual(1500);
    expect(Object.keys(result.deltas).sort()).toEqual(['calories', 'carbs', 'fat', 'protein']);
    expect(result.accuracyPercent).toBeGreaterThanOrEqual(0);
    expect(result.accuracyPercent).toBeLessThanOrEqual(100);
    expect(result.substitute.carbs).toBeCloseTo(result.original.carbs, 1);
    expect(result.grams).toBeGreaterThan(100);
  });


  it('reduces the substitute portion when the remaining daily calories are lower', () => {
    const denseSubstitute = {
      ...substitute,
      id: 3,
      name: 'Granola densa',
      calsPer100g: 450,
      carbsPer100g: 70,
      proteinPer100g: 10,
      fatPer100g: 15,
    } as FoodItem;
    const result = calculateMacroAwareEquivalence(original, denseSubstitute, { maxSubstituteCalories: 100 });
    expect(result.calorieCapApplied).toBe(true);
    expect(result.substitute.calories).toBeLessThanOrEqual(100.5);
    expect(result.grams).toBeGreaterThan(0);
  });
});
