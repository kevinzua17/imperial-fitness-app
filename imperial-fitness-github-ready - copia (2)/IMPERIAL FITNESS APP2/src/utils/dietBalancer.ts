import type { DietMeal, DietMealItem } from '../data/mockData';

export interface DietNutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DietNutritionTargets extends DietNutritionTotals {}

export interface DietBalanceResult {
  meals: DietMeal[];
  totals: DietNutritionTotals;
  compliant: boolean;
  iterations: number;
  issues: string[];
  changedItems: number;
}

const TOLERANCES = {
  calories: 0.05,
  protein: 0.15,
  carbs: 0.20,
  fat: 0.20,
} as const;

const NUTRIENTS = ['calories', 'protein', 'carbs', 'fat'] as const;
type Nutrient = typeof NUTRIENTS[number];

const finitePositive = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const itemPerGram = (item: DietMealItem): DietNutritionTotals => ({
  calories: finitePositive(item.baseCalsPer100g) / 100,
  protein: finitePositive(item.baseProteinPer100g) / 100,
  carbs: finitePositive(item.baseCarbsPer100g) / 100,
  fat: finitePositive(item.baseFatPer100g) / 100,
});

const boundsFor = (item: DietMealItem): [number, number] => {
  if (item.category === 'fat') return [3, 120];
  if (item.category === 'protein') return [40, 450];
  if (item.category === 'carb') return [25, 500];
  if ((item.category as string) === 'fruit') return [60, 350];
  if ((item.category as string) === 'dairy') return [50, 400];
  if (item.category === 'veg') return [80, 350];
  if (item.category === 'drink') return [0, 700];
  return [10, 500];
};

export function calculateDietTotals(meals: DietMeal[]): DietNutritionTotals {
  const totals: DietNutritionTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  meals.forEach(meal => meal.items.forEach(item => {
    const grams = Math.max(0, Number(item.amountGrams) || 0);
    const perGram = itemPerGram(item);
    NUTRIENTS.forEach(key => {
      totals[key] += grams * perGram[key];
    });
  }));
  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
  };
}

export function assessDietBalance(totals: DietNutritionTotals, targets: DietNutritionTargets) {
  const issues: string[] = [];
  NUTRIENTS.forEach(key => {
    const target = finitePositive(targets[key]);
    const actual = finitePositive(totals[key]);
    if (!target || !actual) {
      issues.push(`${key}: faltan datos para validar`);
      return;
    }
    const deviation = Math.abs(actual - target) / target;
    if (deviation > TOLERANCES[key]) {
      const label = key === 'calories' ? 'calorías' : key === 'protein' ? 'proteína' : key === 'carbs' ? 'carbohidratos' : 'grasas';
      const unit = key === 'calories' ? 'kcal' : 'g';
      issues.push(`${label}: ${Math.round(actual)}/${Math.round(target)} ${unit} (${Math.round(deviation * 1000) / 10}% de diferencia)`);
    }
  });
  return { compliant: issues.length === 0, issues };
}

/**
 * Ajusta porciones con mínimos/máximos seguros para que los alimentos reales
 * coincidan con las cuatro metas declaradas. Usa descenso coordinado sobre una
 * función cuadrática ponderada; no inventa alimentos ni cambia nombres.
 */
export function balanceDietMeals(
  sourceMeals: DietMeal[],
  targets: DietNutritionTargets,
  maxPasses = 30,
  lockedMealIndexes: ReadonlySet<number> = new Set<number>(),
): DietBalanceResult {
  const meals = JSON.parse(JSON.stringify(sourceMeals)) as DietMeal[];
  const itemEntries = meals.flatMap((meal, mealIndex) => meal.items.map(item => ({ item, mealIndex })));
  const items = itemEntries.map(entry => entry.item);
  const originals = items.map(item => Math.max(0, Number(item.amountGrams) || 0));

  if (items.length === 0 || NUTRIENTS.some(key => finitePositive(targets[key]) <= 0)) {
    const totals = calculateDietTotals(meals);
    const assessment = assessDietBalance(totals, targets);
    return { meals, totals, compliant: assessment.compliant, issues: assessment.issues, iterations: 0, changedItems: 0 };
  }

  const normalizedContribution = items.map(item => {
    const perGram = itemPerGram(item);
    return {
      calories: perGram.calories / finitePositive(targets.calories),
      protein: perGram.protein / finitePositive(targets.protein),
      carbs: perGram.carbs / finitePositive(targets.carbs),
      fat: perGram.fat / finitePositive(targets.fat),
    };
  });

  const weights: Record<Nutrient, number> = {
    calories: 1 / (TOLERANCES.calories ** 2),
    protein: 1 / (TOLERANCES.protein ** 2),
    carbs: 1 / (TOLERANCES.carbs ** 2),
    fat: 1 / (TOLERANCES.fat ** 2),
  };

  const totalsRaw = (): DietNutritionTotals => {
    const totals: DietNutritionTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    items.forEach(item => {
      const grams = Math.max(0, Number(item.amountGrams) || 0);
      const perGram = itemPerGram(item);
      NUTRIENTS.forEach(key => { totals[key] += grams * perGram[key]; });
    });
    return totals;
  };

  let iterations = 0;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    iterations = pass + 1;
    const currentRounded = calculateDietTotals(meals);
    if (assessDietBalance(currentRounded, targets).compliant) break;

    let changedThisPass = false;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (lockedMealIndexes.has(itemEntries[index].mealIndex)) continue;
      const currentTotals = totalsRaw();
      const [minimum, maximum] = boundsFor(item);
      const currentGrams = Math.max(minimum, Math.min(maximum, Number(item.amountGrams) || minimum));
      const contribution = normalizedContribution[index];

      let numerator = 0;
      let denominator = 0;
      NUTRIENTS.forEach(key => {
        const target = finitePositive(targets[key]);
        const normalizedError = (currentTotals[key] - target) / target;
        numerator += weights[key] * contribution[key] * normalizedError;
        denominator += weights[key] * contribution[key] * contribution[key];
      });

      // Regularización suave: evita saltos extremos cuando hay muchas soluciones.
      const regularization = item.category === 'veg' ? 0.004 : 0.00035;
      const referenceScale = Math.max(25, originals[index] || currentGrams);
      numerator += regularization * ((currentGrams - originals[index]) / (referenceScale ** 2));
      denominator += regularization / (referenceScale ** 2);

      if (denominator <= 0) continue;
      const delta = -numerator / denominator;
      const limitedDelta = Math.max(-80, Math.min(80, delta));
      const nextGrams = Math.round(Math.max(minimum, Math.min(maximum, currentGrams + limitedDelta)) * 10) / 10;
      if (Math.abs(nextGrams - currentGrams) >= 0.1) {
        item.amountGrams = nextGrams;
        changedThisPass = true;
      }
    }

    if (!changedThisPass) break;
  }

  // Corrección energética final de baja intensidad sobre carbohidratos y grasas.
  for (let pass = 0; pass < 6; pass += 1) {
    const totals = calculateDietTotals(meals);
    const calorieDelta = targets.calories - totals.calories;
    if (Math.abs(calorieDelta) / targets.calories <= 0.01) break;
    const preferred = items
      .map((item, index) => ({ item, index, density: itemPerGram(item).calories }))
      .filter(entry => !lockedMealIndexes.has(itemEntries[entry.index].mealIndex) && entry.density > 0 && (entry.item.category === 'carb' || entry.item.category === 'fat'))
      .sort((a, b) => (a.item.category === 'carb' ? -1 : 1) - (b.item.category === 'carb' ? -1 : 1));
    if (!preferred.length) break;
    const entry = preferred[pass % preferred.length];
    const [minimum, maximum] = boundsFor(entry.item);
    const gramsDelta = calorieDelta / entry.density;
    entry.item.amountGrams = Math.round(Math.max(minimum, Math.min(maximum, entry.item.amountGrams + Math.max(-35, Math.min(35, gramsDelta)))) * 10) / 10;
  }

  const totals = calculateDietTotals(meals);
  const assessment = assessDietBalance(totals, targets);
  const changedItems = items.filter((item, index) => Math.abs((Number(item.amountGrams) || 0) - originals[index]) >= 0.1).length;
  return {
    meals,
    totals,
    compliant: assessment.compliant,
    issues: assessment.issues,
    iterations,
    changedItems,
  };
}
