export type NutritionGoalType = 'fat_loss' | 'muscle_gain' | 'strength' | 'maintenance';

export interface NutritionTargetInput {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: 'M' | 'F';
  activityLevel: 'Sedentario' | 'Ligero' | 'Moderado' | 'Intenso' | string;
  bodyFatPercent?: number;
  bmr?: number;
  bmrSource?: 'inbody' | 'mifflin_st_jeor' | 'recorded_bmr';
  goal: string;
  trainingGoal?: string;
}

export interface NutritionTargets {
  goalType: NutritionGoalType;
  goalLabel: string;
  bmr: number;
  bmrSource: 'inbody' | 'mifflin_st_jeor' | 'recorded_bmr';
  maintenanceCalories: number;
  targetCalories: number;
  adjustmentPercent: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  leanMassKg: number;
  fatMassKg: number;
  rationale: string;
}

export interface MacroTotals {
  protein: number;
  carbs: number;
  fat: number;
  cals: number;
}

export interface MacroItemInput {
  amountGrams: number;
  baseProteinPer100g?: number;
  baseCarbsPer100g?: number;
  baseFatPer100g?: number;
  baseCalsPer100g?: number;
}

const ACTIVITY_FACTORS: Record<string, number> = {
  Sedentario: 1.2,
  Ligero: 1.375,
  Moderado: 1.55,
  Intenso: 1.725,
};

const requiredNumber = (value: number | undefined, label: string, min: number, max: number) => {
  if (!Number.isFinite(value) || Number(value) < min || Number(value) > max) {
    throw new Error(`${label} debe estar entre ${min} y ${max}; no se usarán valores supuestos.`);
  }
  return Number(value);
};
const round = (value: number) => Math.round(value);

export function detectNutritionGoal(goal: string, trainingGoal = ''): NutritionGoalType {
  const goalText = goal.toLocaleLowerCase('es');
  if (/p[eé]rdida|perdida|grasa|definici[oó]n|definicion|recomposici[oó]n|bajar|adelgaz|reducir peso|descenso/.test(goalText)) return 'fat_loss';
  if (/hipertrofia|masa muscular|ganancia muscular|ganar masa|aumentar masa|crecimiento muscular|volumen|gl[uú]teo/.test(goalText)) return 'muscle_gain';
  if (/fuerza|powerlifting/.test(goalText)) return 'strength';
  if (/mantenimiento|rendimiento|salud|tonific/.test(goalText)) return 'maintenance';

  const trainingText = trainingGoal.toLocaleLowerCase('es');
  if (/fuerza|powerlifting/.test(trainingText)) return 'strength';
  if (/hipertrofia|masa|volumen/.test(trainingText)) return 'muscle_gain';
  return 'maintenance';
}

export function calculateNutritionTargets(input: NutritionTargetInput): NutritionTargets {
  // Compatibilidad para pruebas/utilidades. La aplicación productiva usa el motor v2 del backend.
  const weightKg = requiredNumber(input.weightKg, 'Peso', 20, 300);
  const heightCm = requiredNumber(input.heightCm, 'Estatura', 120, 250);
  const age = round(requiredNumber(input.age, 'Edad', 18, 100));
  if (!['M', 'F'].includes(input.gender)) throw new Error('Debes seleccionar sexo M/F para la fórmula.');
  const activityFactor = ACTIVITY_FACTORS[input.activityLevel];
  if (!activityFactor) throw new Error('Debes seleccionar un nivel de actividad válido; no se asumirá actividad moderada.');

  const hasBodyFat = Number.isFinite(input.bodyFatPercent) && Number(input.bodyFatPercent) >= 2 && Number(input.bodyFatPercent) <= 70;
  const bodyFatPercent = hasBodyFat ? Number(input.bodyFatPercent) : undefined;
  const fatMassKg = bodyFatPercent === undefined ? 0 : Math.round(weightKg * bodyFatPercent) / 100;
  const leanMassKg = bodyFatPercent === undefined ? weightKg : Math.max(1, Math.round((weightKg - fatMassKg) * 10) / 10);

  const recordedBmr = Number.isFinite(input.bmr) && Number(input.bmr) >= 500 && Number(input.bmr) <= 6000 ? Number(input.bmr) : undefined;
  const useInBody = recordedBmr !== undefined && input.bmrSource === 'inbody';
  const bmr = useInBody
    ? round(recordedBmr)
    : round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + (input.gender === 'F' ? -161 : 5));
  const bmrSource: NutritionTargets['bmrSource'] = useInBody ? 'inbody' : 'mifflin_st_jeor';
  const maintenanceCalories = round(bmr * activityFactor);
  const goalType = detectNutritionGoal(input.goal, input.trainingGoal);
  const adjustmentPercent = goalType === 'fat_loss' ? -15 : goalType === 'muscle_gain' ? 8 : goalType === 'strength' ? 5 : 0;
  const sexFloor = input.gender === 'F' ? 1200 : 1500;
  const targetCalories = Math.max(sexFloor, round(maintenanceCalories * (1 + adjustmentPercent / 100)));

  const proteinTargetPerKg = goalType === 'fat_loss' ? 2.0 : goalType === 'muscle_gain' || goalType === 'strength' ? 1.8 : 1.6;
  const proteinGrams = round(Math.min(weightKg * 2.4, Math.max(weightKg * proteinTargetPerKg, leanMassKg * 1.8)));
  const fatGrams = round(Math.max(weightKg * 0.8, (targetCalories * 0.25) / 9));
  const carbsGrams = Math.max(50, round((targetCalories - proteinGrams * 4 - fatGrams * 9) / 4));

  const goalLabel = {
    fat_loss: 'Pérdida de grasa',
    muscle_gain: 'Hipertrofia / ganancia muscular',
    strength: 'Fuerza',
    maintenance: 'Mantenimiento / rendimiento',
  }[goalType];
  const direction = adjustmentPercent < 0 ? `${Math.abs(adjustmentPercent)}% de déficit` : adjustmentPercent > 0 ? `${adjustmentPercent}% de superávit` : 'mantenimiento energético';

  return {
    goalType,
    goalLabel,
    bmr,
    bmrSource,
    maintenanceCalories,
    targetCalories,
    adjustmentPercent,
    proteinGrams,
    carbsGrams,
    fatGrams,
    leanMassKg,
    fatMassKg: Math.round(fatMassKg * 10) / 10,
    rationale: `${goalLabel}: ${direction} sobre un mantenimiento estimado de ${maintenanceCalories} kcal. Fuente TMB: ${bmrSource}.`,
  };
}

export function calculateItemMacros(item: MacroItemInput): MacroTotals {
  const ratio = Math.max(0, Number(item.amountGrams) || 0) / 100;
  return {
    protein: round(ratio * Math.max(0, Number(item.baseProteinPer100g) || 0)),
    carbs: round(ratio * Math.max(0, Number(item.baseCarbsPer100g) || 0)),
    fat: round(ratio * Math.max(0, Number(item.baseFatPer100g) || 0)),
    cals: round(ratio * Math.max(0, Number(item.baseCalsPer100g) || 0)),
  };
}

export function sumMacroTotals(items: MacroTotals[]): MacroTotals {
  return items.reduce((total, item) => ({
    protein: total.protein + item.protein,
    carbs: total.carbs + item.carbs,
    fat: total.fat + item.fat,
    cals: total.cals + item.cals,
  }), { protein: 0, carbs: 0, fat: 0, cals: 0 });
}

export function assessCalorieCompliance(actualCalories: number, targetCalories: number) {
  const safeTarget = Math.max(1, targetCalories);
  const delta = round(actualCalories - safeTarget);
  const percentDifference = Math.round((Math.abs(delta) / safeTarget) * 1000) / 10;
  const status = percentDifference <= 5 ? 'on_target' : percentDifference <= 10 ? 'near_target' : 'off_target';
  const remaining = Math.max(0, -delta);
  const excess = Math.max(0, delta);
  return { delta, percentDifference, status, remaining, excess } as const;
}


export function assessNutritionCompliance(
  actual: MacroTotals,
  target: MacroTotals,
) {
  const rules = [
    { key: 'cals' as const, label: 'calorías', unit: 'kcal', tolerance: 5 },
    { key: 'protein' as const, label: 'proteína', unit: 'g', tolerance: 15 },
    { key: 'carbs' as const, label: 'carbohidratos', unit: 'g', tolerance: 20 },
    { key: 'fat' as const, label: 'grasas', unit: 'g', tolerance: 20 },
  ];
  const metrics = rules.map(rule => {
    const targetValue = Math.max(0, Number(target[rule.key]) || 0);
    const actualValue = Math.max(0, Number(actual[rule.key]) || 0);
    const percentDifference = targetValue > 0
      ? Math.round((Math.abs(actualValue - targetValue) / targetValue) * 1000) / 10
      : 0;
    return { ...rule, actual: actualValue, target: targetValue, percentDifference, compliant: targetValue > 0 && actualValue > 0 && percentDifference <= rule.tolerance };
  });
  return {
    isCompliant: metrics.every(metric => metric.compliant),
    metrics,
    issues: metrics
      .filter(metric => !metric.compliant)
      .map(metric => `${metric.label}: ${metric.actual}/${metric.target} ${metric.unit} (${metric.percentDifference}% de diferencia; máximo ${metric.tolerance}%)`),
  };
}

export function validateFoodCaloriesPer100g(protein: number, carbs: number, fat: number, calories: number) {
  const calculated = Math.round(Math.max(0, protein) * 4 + Math.max(0, carbs) * 4 + Math.max(0, fat) * 9);
  const difference = Math.abs(calculated - Math.max(0, calories));
  const tolerance = Math.max(20, calculated * 0.15);
  return { calculated, difference, isConsistent: difference <= tolerance };
}
