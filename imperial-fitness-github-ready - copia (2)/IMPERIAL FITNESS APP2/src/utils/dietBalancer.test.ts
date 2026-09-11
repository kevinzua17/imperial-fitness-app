import { describe, expect, it } from 'vitest';
import type { DietMeal } from '../data/mockData';
import { balanceDietMeals, calculateDietTotals } from './dietBalancer';

const meals: DietMeal[] = [
  {
    name: 'Desayuno',
    items: [
      { id: '1', originalName: 'Claras', currentName: 'Claras', amountGrams: 250, baseCalsPer100g: 52, baseProteinPer100g: 11, baseCarbsPer100g: 1, baseFatPer100g: 0.2, category: 'protein' },
      { id: '2', originalName: 'Avena', currentName: 'Avena', amountGrams: 70, baseCalsPer100g: 389, baseProteinPer100g: 13, baseCarbsPer100g: 66, baseFatPer100g: 7, category: 'carb' },
    ],
  },
  {
    name: 'Almuerzo',
    items: [
      { id: '3', originalName: 'Pollo', currentName: 'Pollo', amountGrams: 180, baseCalsPer100g: 165, baseProteinPer100g: 31, baseCarbsPer100g: 0, baseFatPer100g: 3.6, category: 'protein' },
      { id: '4', originalName: 'Arroz', currentName: 'Arroz', amountGrams: 250, baseCalsPer100g: 130, baseProteinPer100g: 2.7, baseCarbsPer100g: 28, baseFatPer100g: 0.3, category: 'carb' },
      { id: '5', originalName: 'Aguacate', currentName: 'Aguacate', amountGrams: 80, baseCalsPer100g: 160, baseProteinPer100g: 2, baseCarbsPer100g: 8, baseFatPer100g: 15, category: 'fat' },
    ],
  },
  {
    name: 'Snack',
    items: [
      { id: '6', originalName: 'Yogur', currentName: 'Yogur', amountGrams: 250, baseCalsPer100g: 59, baseProteinPer100g: 10, baseCarbsPer100g: 4, baseFatPer100g: 0.4, category: 'protein' },
      { id: '7', originalName: 'Pan', currentName: 'Pan', amountGrams: 100, baseCalsPer100g: 247, baseProteinPer100g: 13, baseCarbsPer100g: 43, baseFatPer100g: 3.4, category: 'carb' },
    ],
  },
  {
    name: 'Cena',
    items: [
      { id: '8', originalName: 'Tilapia', currentName: 'Tilapia', amountGrams: 200, baseCalsPer100g: 128, baseProteinPer100g: 26, baseCarbsPer100g: 0, baseFatPer100g: 2.3, category: 'protein' },
      { id: '9', originalName: 'Papa', currentName: 'Papa', amountGrams: 250, baseCalsPer100g: 77, baseProteinPer100g: 1.7, baseCarbsPer100g: 17, baseFatPer100g: 0.1, category: 'carb' },
      { id: '10', originalName: 'Aceite', currentName: 'Aceite', amountGrams: 15, baseCalsPer100g: 884, baseProteinPer100g: 0, baseCarbsPer100g: 0, baseFatPer100g: 100, category: 'fat' },
    ],
  },
];

describe('balanceDietMeals', () => {
  it('equilibra calorías y los tres macronutrientes', () => {
    expect(calculateDietTotals(meals).calories).toBeGreaterThan(2000);
    const result = balanceDietMeals(meals, { calories: 2000, protein: 150, carbs: 220, fat: 58 }, 60);
    expect(result.compliant).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.changedItems).toBeGreaterThan(0);
  });

  it('no modifica los nombres ni la cantidad de comidas', () => {
    const namesBefore = meals.flatMap(meal => meal.items.map(item => item.currentName));
    const result = balanceDietMeals(meals, { calories: 2000, protein: 150, carbs: 220, fat: 58 }, 60);
    const namesAfter = result.meals.flatMap(meal => meal.items.map(item => item.currentName));
    expect(result.meals).toHaveLength(meals.length);
    expect(namesAfter).toEqual(namesBefore);
  });
});
