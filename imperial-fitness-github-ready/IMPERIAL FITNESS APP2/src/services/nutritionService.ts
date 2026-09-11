import { FoodItem } from '../data/foodDatabase';
import { DietMeal, DietPlan } from '../data/mockData';
import { apiRequest } from './api';
import { decodeHtmlEntities } from '../utils/html';

import { ApiFood, apiFoodToFoodItem } from './mappers';

const DIET_PUBLICATION_MARKER = /\n?\[\[IMPERIAL_PUBLICATION\|([^|\]]+)\|([^\]]*)\]\]\s*$/;

function parseDietNotes(notes: string): { diagnosis: string; publishedAt?: string; publishedBy?: string } {
  const raw = notes || '';
  const match = raw.match(DIET_PUBLICATION_MARKER);
  if (!match) return { diagnosis: raw };
  let publishedAt = '';
  let publishedBy = '';
  try { publishedAt = decodeURIComponent(match[1]); } catch { publishedAt = match[1]; }
  try { publishedBy = decodeURIComponent(match[2]); } catch { publishedBy = match[2]; }
  return {
    diagnosis: raw.replace(DIET_PUBLICATION_MARKER, '').trim(),
    publishedAt: publishedAt || undefined,
    publishedBy: publishedBy || undefined,
  };
}



export interface EquivalenceApiResult {
  original_food: string;
  substitute_food: string;
  original_grams: number;
  substitute_grams: number;
  basis: string;
  client_note: string;
  trainer_note: string;
  original_macros: Record<'calories' | 'protein' | 'carbs' | 'fat', number>;
  substitute_macros: Record<'calories' | 'protein' | 'carbs' | 'fat', number>;
  deltas: Record<'calories' | 'protein' | 'carbs' | 'fat', number>;
  accuracy_percent: number;
  compatibility: 'alta' | 'media' | 'baja';
  is_exact: boolean;
  calorie_cap_applied?: boolean;
  max_substitute_calories?: number | null;
  warning?: string | null;
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

export interface NutritionTargetApi extends Record<string, unknown> {
  bmr: number;
  bmr_source: 'inbody' | 'mifflin_st_jeor' | 'recorded_bmr';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'athlete';
  activity_factor: number;
  maintenance_calories: number;
  adjustment_percent: number;
  target_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  goal_type: string;
  goal_label: string;
  formula_version: string;
  calculated_at: string;
  warnings: string[];
  inputs: Record<string, unknown>;
  based_on_metric_id?: number | null;
}

export async function previewNutritionTargetsFromApi(clientId: string, goal?: string): Promise<NutritionTargetApi> {
  return apiRequest<NutritionTargetApi>('/nutrition/targets/preview', {
    method: 'POST',
    body: JSON.stringify({ client_id: Number(clientId), goal: goal || undefined }),
    cache: 'no-store',
  });
}

export async function calculateEquivalenceFromApi(
  originalFoodId: number,
  substituteFoodId: number,
  originalGrams: number,
  maxSubstituteCalories?: number,
): Promise<EquivalenceApiResult> {
  return apiRequest<EquivalenceApiResult>('/nutrition/equivalence', {
    method: 'POST',
    body: JSON.stringify({
      original_food_id: originalFoodId,
      substitute_food_id: substituteFoodId,
      original_grams: originalGrams,
      max_substitute_calories: Number.isFinite(maxSubstituteCalories) ? maxSubstituteCalories : undefined,
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
  status?: 'draft' | 'published' | 'archived';
  version?: number;
  calculation_json?: string;
  based_on_metric_id?: number | null;
  approved_by?: number | null;
  published_at?: string | null;
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

function parseCalculation(calculationJson?: string): Record<string, unknown> | undefined {
  if (!calculationJson) return undefined;
  try {
    const parsed = JSON.parse(calculationJson);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function apiDietToDietPlan(plan: ApiDietPlan): DietPlan {
  const parsedNotes = parseDietNotes(plan.notes);
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
    specialistDiagnosis: parsedNotes.diagnosis || 'Plan nutricional asignado por el equipo Imperial.',
    publishedAt: plan.published_at || parsedNotes.publishedAt,
    publishedBy: parsedNotes.publishedBy,
    status: plan.status || 'published',
    version: plan.version || 1,
    calculation: parseCalculation(plan.calculation_json),
    basedOnMetricId: plan.based_on_metric_id || undefined,
  };
}

export async function listDietPlansFromApi(clientId?: string): Promise<DietPlan[]> {
  const suffix = clientId ? `?client_id=${encodeURIComponent(clientId)}` : '';
  const plans = await apiRequest<ApiDietPlan[]>(`/nutrition/diet-plans${suffix}`, clientId ? { cache: 'no-store' } : {});
  return plans.map(apiDietToDietPlan);
}

export async function getMyDietPlanFromApi(): Promise<DietPlan | null> {
  const plan = await apiRequest<ApiDietPlan | null>('/nutrition/diet-plans/my-plan', { cache: 'no-store' });
  return plan ? apiDietToDietPlan(plan) : null;
}

export async function listDietDraftsFromApi(clientId: string): Promise<DietPlan[]> {
  const plans = await apiRequest<ApiDietPlan[]>(`/nutrition/diet-plans/drafts?client_id=${encodeURIComponent(clientId)}`, { cache: 'no-store' });
  return plans.map(apiDietToDietPlan);
}

export async function createDietPlanInApi(
  plan: DietPlan,
  status: 'draft' | 'published' = plan.status === 'published' ? 'published' : 'draft',
): Promise<DietPlan> {
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
      notes: (plan.specialistDiagnosis || '').replace(DIET_PUBLICATION_MARKER, '').trim(),
      status,
      active: status === 'published' ? 1 : 0,
      calculation_json: JSON.stringify(plan.calculation || {}),
      based_on_metric_id: plan.basedOnMetricId,
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
  if (updates.specialistDiagnosis !== undefined) {
    body.notes = (updates.specialistDiagnosis || '').replace(DIET_PUBLICATION_MARKER, '').trim();
  }
  if (updates.calculation !== undefined) body.calculation_json = JSON.stringify(updates.calculation);
  if (updates.basedOnMetricId !== undefined) body.based_on_metric_id = updates.basedOnMetricId;

  const updated = await apiRequest<ApiDietPlan>(`/nutrition/diet-plans/${encodeURIComponent(planId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return apiDietToDietPlan(updated);
}

export async function updateMyDietPlanMealsFromApi(meals: DietMeal[]): Promise<DietPlan> {
  const updated = await apiRequest<ApiDietPlan>('/nutrition/diet-plans/my-plan/meals', {
    method: 'PUT',
    body: JSON.stringify({ meals_json: JSON.stringify(meals) }),
  });
  return apiDietToDietPlan(updated);
}

export async function publishDietPlanInApi(planId: string): Promise<DietPlan> {
  const published = await apiRequest<ApiDietPlan>(`/nutrition/diet-plans/${encodeURIComponent(planId)}/publish`, {
    method: 'POST',
  });
  return apiDietToDietPlan(published);
}

export async function deleteDietPlanInApi(planId: string): Promise<void> {
  await apiRequest<{ ok: boolean }>(`/nutrition/diet-plans/${encodeURIComponent(planId)}`, {
    method: 'DELETE',
  });
}

export async function approveNutritionSafetyReviewFromApi(clientId: string): Promise<{ ok: boolean; reviewed_at?: string | null }> {
  return apiRequest(`/nutrition/clients/${encodeURIComponent(clientId)}/safety-review`, { method: 'POST' });
}
