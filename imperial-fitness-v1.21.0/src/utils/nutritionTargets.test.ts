import { describe, expect, it } from 'vitest';
import { assessCalorieCompliance, assessNutritionCompliance, calculateItemMacros, calculateNutritionTargets, detectNutritionGoal, sumMacroTotals, validateFoodCaloriesPer100g } from './nutritionTargets';

const base = {
  weightKg: 80,
  heightCm: 178,
  age: 32,
  gender: 'M' as const,
  activityLevel: 'Moderado',
  bodyFatPercent: 20,
};

describe('nutrition targets', () => {
  it('creates a deficit for fat loss and a surplus for hypertrophy', () => {
    const loss = calculateNutritionTargets({ ...base, goal: 'Pérdida de grasa' });
    const gain = calculateNutritionTargets({ ...base, goal: 'Hipertrofia y ganancia muscular' });
    expect(loss.targetCalories).toBeLessThan(loss.maintenanceCalories);
    expect(gain.targetCalories).toBeGreaterThan(gain.maintenanceCalories);
    expect(loss.proteinGrams).toBeGreaterThanOrEqual(gain.proteinGrams);
  });


  it('does not let the routine selector override an explicit maintenance goal', () => {
    expect(detectNutritionGoal('Tonificación y Rendimiento', 'hipertrofia')).toBe('maintenance');
    expect(detectNutritionGoal('Quiero bajar grasa', 'hipertrofia')).toBe('fat_loss');
  });

  it('keeps target macro energy close to prescribed calories', () => {
    const target = calculateNutritionTargets({ ...base, goal: 'Hipertrofia' });
    const macroCalories = target.proteinGrams * 4 + target.carbsGrams * 4 + target.fatGrams * 9;
    expect(Math.abs(macroCalories - target.targetCalories)).toBeLessThanOrEqual(25);
  });

  it('totals real portions and classifies daily compliance', () => {
    const chicken = calculateItemMacros({ amountGrams: 150, baseProteinPer100g: 31, baseCarbsPer100g: 0, baseFatPer100g: 3.6, baseCalsPer100g: 165 });
    const rice = calculateItemMacros({ amountGrams: 200, baseProteinPer100g: 2.7, baseCarbsPer100g: 28, baseFatPer100g: 0.3, baseCalsPer100g: 130 });
    const total = sumMacroTotals([chicken, rice]);
    expect(total.cals).toBe(508);
    expect(total.protein).toBeGreaterThan(50);
    expect(assessCalorieCompliance(2020, 2000).status).toBe('on_target');
  });

  it('detects inconsistent manually entered macros', () => {
    expect(validateFoodCaloriesPer100g(30, 0, 3, 165).isConsistent).toBe(true);
    expect(validateFoodCaloriesPer100g(0, 0, 0, 500).isConsistent).toBe(false);
  });
});


describe('assessNutritionCompliance', () => {
  it('rejects a menu with correct calories but insufficient protein', () => {
    const result = assessNutritionCompliance(
      { cals: 2000, protein: 80, carbs: 260, fat: 60 },
      { cals: 2000, protein: 150, carbs: 240, fat: 60 },
    );
    expect(result.isCompliant).toBe(false);
    expect(result.issues.join(' ')).toContain('proteína');
  });
});
