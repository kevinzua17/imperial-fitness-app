import { ClientProfile, Role } from '../data/mockData';
import { FoodItem, RoutineTemplate } from '../data/foodDatabase';

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  avatar_url?: string | null;
  assigned_trainer_id?: number | null;
  tokens: number;
  weight?: number | null;
  height?: number | null;
  body_fat?: number | null;
  muscle_mass?: number | null;
  goal?: string | null;
  created_at: string;
}

export interface ApiFood {
  id: number;
  name: string;
  category: FoodItem['category'];
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  cals_per_100g: number;
  fiber_per_100g: number;
  client_note: string;
  trainer_note: string;
}

export interface ApiRoutineTemplate {
  id: number;
  title: string;
  target_goal: string;
  level: RoutineTemplate['level'];
  days_per_week: number;
  description: string;
  trainer_rationale: string;
  payload?: Partial<RoutineTemplate>;
}

export function apiUserToClientProfile(user: ApiUser): ClientProfile {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    avatar: user.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    tokens: user.tokens || 0,
    assignedTrainerId: user.assigned_trainer_id ? String(user.assigned_trainer_id) : undefined,
    weight: user.weight || undefined,
    height: user.height || undefined,
    bodyFat: user.body_fat || undefined,
    goal: user.goal || undefined,
    age: 28,
    gender: 'M',
    muscleMass: user.muscle_mass || 32,
    waterPercent: 56,
    experienceLevel: user.role === 'trainer' ? 'Avanzado' : 'Intermedio',
    activityLevel: 'Moderado',
    injuries: 'Sin registrar',
    weaknesses: 'Sin registrar',
    attendanceRate: user.role === 'client' ? 85 : 100,
    retentionRisk: 'Bajo',
    lastAttendance: 'Sincronizado desde API',
    plan: user.role === 'client' ? 'Imperial Infinite Pass' : user.role === 'trainer' ? 'Especialista Imperial' : 'Administrador Imperial',
    streak: user.role === 'client' ? 1 : 0,
  };
}

export function apiFoodToFoodItem(food: ApiFood): FoodItem {
  return {
    id: food.id,
    name: food.name,
    category: food.category,
    proteinPer100g: food.protein_per_100g,
    carbsPer100g: food.carbs_per_100g,
    fatPer100g: food.fat_per_100g,
    calsPer100g: food.cals_per_100g,
    fiberPer100g: food.fiber_per_100g,
    clientNote: food.client_note,
    trainerNote: food.trainer_note,
  };
}

export function apiRoutineToRoutineTemplate(routine: ApiRoutineTemplate): RoutineTemplate {
  const payload = routine.payload || {};
  return {
    id: String(routine.id),
    title: routine.title,
    targetGoal: routine.target_goal,
    level: routine.level,
    daysPerWeek: routine.days_per_week,
    description: routine.description,
    trainerRationale: routine.trainer_rationale,
    days: payload.days || [],
  };
}