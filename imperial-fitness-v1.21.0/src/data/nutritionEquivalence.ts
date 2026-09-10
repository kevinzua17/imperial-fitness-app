import type { DietMealItem } from './mockData';
import type { FoodItem } from './foodDatabase';

export interface MacroSnapshot {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionEquivalenceResult {
  grams: number;
  original: MacroSnapshot;
  substitute: MacroSnapshot;
  deltas: MacroSnapshot;
  accuracyPercent: number;
  compatibility: 'alta' | 'media' | 'baja';
  isExact: boolean;
  calorieCapApplied?: boolean;
  maxSubstituteCalories?: number;
}

export interface NutritionEquivalenceOptions {
  maxSubstituteCalories?: number;
}

function portion(per100: MacroSnapshot, grams: number): MacroSnapshot {
  const factor = grams / 100;
  return {
    calories: per100.calories * factor,
    protein: per100.protein * factor,
    carbs: per100.carbs * factor,
    fat: per100.fat * factor,
  };
}

function itemPer100(item: DietMealItem): MacroSnapshot {
  return {
    calories: item.baseCalsPer100g || 0,
    protein: item.baseProteinPer100g || 0,
    carbs: item.baseCarbsPer100g || 0,
    fat: item.baseFatPer100g || 0,
  };
}

function foodPer100(food: FoodItem): MacroSnapshot {
  return {
    calories: food.calsPer100g || 0,
    protein: food.proteinPer100g || 0,
    carbs: food.carbsPer100g || 0,
    fat: food.fatPer100g || 0,
  };
}

export function calculateMacroAwareEquivalence(item: DietMealItem, substituteFood: FoodItem, options: NutritionEquivalenceOptions = {}): NutritionEquivalenceResult {
  const original = portion(itemPer100(item), item.amountGrams);
  const substitutePer100 = foodPer100(substituteFood);
  const substitutePerGram: MacroSnapshot = {
    calories: substitutePer100.calories / 100,
    protein: substitutePer100.protein / 100,
    carbs: substitutePer100.carbs / 100,
    fat: substitutePer100.fat / 100,
  };

  const focus: keyof MacroSnapshot = item.category === 'protein'
    ? 'protein'
    : item.category === 'fat'
      ? 'fat'
      : item.category === 'carb'
        ? 'carbs'
        : 'calories';
  const basis: keyof MacroSnapshot = original[focus] > 0 && substitutePerGram[focus] > 0 ? focus : 'calories';
  const unconstrainedGrams = original[basis] > 0 && substitutePerGram[basis] > 0
    ? original[basis] / substitutePerGram[basis]
    : item.amountGrams;
  const requestedCalorieCap = Number(options.maxSubstituteCalories);
  const hasCalorieCap = Number.isFinite(requestedCalorieCap) && requestedCalorieCap >= 0;
  const maxGramsByCalories = hasCalorieCap && substitutePerGram.calories > 0
    ? requestedCalorieCap / substitutePerGram.calories
    : 1500;
  const calorieCapApplied = hasCalorieCap && unconstrainedGrams > maxGramsByCalories;
  const cappedGrams = Math.min(1500, unconstrainedGrams, maxGramsByCalories);
  const grams = cappedGrams < 1 ? 0 : Math.round(Math.max(1, cappedGrams) * 10) / 10;
  const substitute = portion(substitutePer100, grams);
  const deltas: MacroSnapshot = {
    calories: substitute.calories - original.calories,
    protein: substitute.protein - original.protein,
    carbs: substitute.carbs - original.carbs,
    fat: substitute.fat - original.fat,
  };

  const weights: Record<keyof MacroSnapshot, number> = { calories: 3, protein: 1, carbs: 1, fat: 1 };
  weights[basis] = 6;
  let weightedError = 0;
  let weightTotal = 0;
  (Object.keys(original) as Array<keyof MacroSnapshot>).forEach((nutrient) => {
    const target = original[nutrient];
    if (target <= 0 || (nutrient !== 'calories' && target < 1)) return;
    weightedError += weights[nutrient] * Math.abs(deltas[nutrient]) / target;
    weightTotal += weights[nutrient];
  });
  const meanError = weightTotal ? weightedError / weightTotal : 1;
  const accuracyPercent = Math.round(Math.max(0, Math.min(100, (1 - meanError) * 100)) * 10) / 10;
  const isExact = Math.abs(deltas.calories) <= 10
    && Math.abs(deltas.protein) <= 1.5
    && Math.abs(deltas.carbs) <= 2
    && Math.abs(deltas.fat) <= 1;
  const compatibility = grams < 5 || grams > 800
    ? 'baja'
    : accuracyPercent >= 90
      ? 'alta'
      : accuracyPercent >= 75
        ? 'media'
        : 'baja';

  return { grams, original, substitute, deltas, accuracyPercent, compatibility, isExact, calorieCapApplied, maxSubstituteCalories: hasCalorieCap ? Math.round(requestedCalorieCap * 10) / 10 : undefined };
}
