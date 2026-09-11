import { FoodItem } from '../data/foodDatabase';
import { DietMeal, DietPlan } from '../data/mockData';
import { apiRequest } from './api';

function decodeHtmlEntities(value: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}
import { ApiFood, apiFoodToFoodItem } from './mappers';

export interface EquivalenceApiResult {
  original_food: string;
  substitute_food: string;
  original_grams: number;
  substitute_grams: number;
  basis: string;
  client_note: string;
  trainer_note: string;
}

export async function listFoodsFromApi(category?: string, search?: string): Promise<FoodItem[]> {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.set('category', category);
  if (search) params.set('search', search);

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const foods = await apiRequest<ApiFood[]>(`/nutrition/foods${suffix}`);
  return foods.map(apiFoodToFoodItem);
}



export interface FoodPayload {
  name: string;
  category: FoodItem['category'];
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  cals_per_100g: number;
  fiber_per_100g?: number;
  client_note?: string;
  trainer_note?: string;
}

export async function createFoodInApi(payload: FoodPayload): Promise<FoodItem> {
  const food = await apiRequest<ApiFood>('/nutrition/foods', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return apiFoodToFoodItem(food);
}

export async function getScienceGuidelinesFromApi(): Promise<{ nutrition: Record<string, unknown>; training: Record<string, unknown>; safety_notice: string }> {
  return apiRequest('/nutrition/science-guidelines');
}

export async function calculateEquivalenceFromApi(
  originalFoodId: number,
  substituteFoodId: number,
  originalGrams: number
): Promise<EquivalenceApiResult> {
  return apiRequest<EquivalenceApiResult>('/nutrition/equivalence', {
    method: 'POST',
    body: JSON.stringify({
      original_food_id: originalFoodId,
      substitute_food_id: substituteFoodId,
      original_grams: originalGrams,
    }),
  });
}

interface ApiDietPlan {
  id: number;
  client_id: number;
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals_json?: string;
  notes: string;
  created_at: string;
}

function parseMeals(mealsJson?: string): DietMeal[] {
  if (!mealsJson) return [];
  try {
    const parsed = JSON.parse(mealsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    try {
      const parsed = JSON.parse(decodeHtmlEntities(mealsJson));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

function apiDietToDietPlan(plan: ApiDietPlan): DietPlan {
  return {
    id: String(plan.id),
    clientId: String(plan.client_id),
    clientName: `Cliente ${plan.client_id}`,
    baseCalories: plan.calories,
    protein: plan.protein,
    carbs: plan.carbs,
    fat: plan.fat,
    goal: plan.title,
    generatedDate: plan.created_at.split('T')[0],
    meals: parseMeals(plan.meals_json),
    hydration: 'Hidratación ajustada por el especialista.',
    supplementation: [],
    specialistDiagnosis: plan.notes || 'Plan nutricional asignado desde el backend.',
  };
}

export async function listDietPlansFromApi(clientId?: string): Promise<DietPlan[]> {
  const suffix = clientId ? `?client_id=${encodeURIComponent(clientId)}` : '';
  const plans = await apiRequest<ApiDietPlan[]>(`/nutrition/diet-plans${suffix}`);
  return plans.map(apiDietToDietPlan);
}

export async function getMyDietPlanFromApi(): Promise<DietPlan | null> {
  const plan = await apiRequest<ApiDietPlan | null>('/nutrition/diet-plans/my-plan');
  return plan ? apiDietToDietPlan(plan) : null;
}

export async function createDietPlanInApi(plan: DietPlan): Promise<DietPlan> {
  const created = await apiRequest<ApiDietPlan>('/nutrition/diet-plans', {
    method: 'POST',
    body: JSON.stringify({
      client_id: Number(plan.clientId),
      title: plan.goal,
      calories: plan.baseCalories,
      protein: plan.protein,
      carbs: plan.carbs,
      fat: plan.fat,
      meals_json: JSON.stringify(plan.meals),
      notes: plan.specialistDiagnosis,
    }),
  });
  return { ...apiDietToDietPlan(created), clientName: plan.clientName };
}

export async function updateDietPlanInApi(planId: string, updates: Partial<DietPlan>): Promise<DietPlan> {
  const body: Record<string, unknown> = {};
  if (updates.goal !== undefined) body.title = updates.goal;
  if (updates.baseCalories !== undefined) body.calories = updates.baseCalories;
  if (updates.protein !== undefined) body.protein = updates.protein;
  if (updates.carbs !== undefined) body.carbs = updates.carbs;
  if (updates.fat !== undefined) body.fat = updates.fat;
  if (updates.meals !== undefined) body.meals_json = JSON.stringify(updates.meals);
  if (updates.specialistDiagnosis !== undefined) body.notes = updates.specialistDiagnosis;

  const updated = await apiRequest<ApiDietPlan>(`/nutrition/diet-plans/${encodeURIComponent(planId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return apiDietToDietPlan(updated);
}

export async function deleteDietPlanInApi(planId: string): Promise<void> {
  await apiRequest<{ ok: boolean }>(`/nutrition/diet-plans/${encodeURIComponent(planId)}`, {
    method: 'DELETE',
  });
}
