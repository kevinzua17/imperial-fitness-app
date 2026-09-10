import { ClientProfile, Role } from '../data/mockData';
import { FoodItem, RoutineTemplate } from '../data/foodDatabase';
import { API_URL } from './api';

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  avatar_url?: string | null;
  phone_number?: string | null;
  whatsapp_opt_in?: number | null;
  assigned_trainer_id?: number | null;
  tokens: number;
  weight?: number | null;
  height?: number | null;
  age?: number | null;
  gender?: 'M' | 'F' | null;
  body_fat?: number | null;
  muscle_mass?: number | null;
  goal?: string | null;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'athlete' | null;
  workouts_per_week?: number | null;
  average_daily_steps?: number | null;
  occupation_activity?: 'sedentary' | 'light' | 'active' | 'physical' | null;
  pending_at?: string | null;
  activated_at?: string | null;
  suspended_at?: string | null;
  status_changed_at?: string | null;
  access_note?: string | null;
  service_tier?: 'lite' | 'premium' | 'hybrid';
  experience_mode?: 'lite' | 'premium' | 'hybrid';
  created_at: string;
}

const ACTIVITY_LABELS: Record<string, ClientProfile['activityLevel']> = {
  sedentary: 'Sedentario',
  light: 'Ligero',
  moderate: 'Moderado',
  very_active: 'Intenso',
  athlete: 'Atleta',
};

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

function mediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return `${API_URL}${url}`;
  return url;
}

export function apiUserToClientProfile(user: ApiUser): ClientProfile {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    phoneNumber: user.phone_number || undefined,
    whatsappOptIn: user.whatsapp_opt_in !== 0,
    pendingAt: user.pending_at || undefined,
    activatedAt: user.activated_at || undefined,
    suspendedAt: user.suspended_at || undefined,
    statusChangedAt: user.status_changed_at || undefined,
    accessNote: user.access_note || undefined,
    serviceTier: user.service_tier || 'premium',
    experienceMode: user.experience_mode || 'premium',
    role: user.role,
    status: user.status,
    avatar: mediaUrl(user.avatar_url) || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    tokens: user.tokens || 0,
    assignedTrainerId: user.assigned_trainer_id ? String(user.assigned_trainer_id) : undefined,
    weight: user.weight || undefined,
    height: user.height || undefined,
    age: user.age ?? undefined,
    gender: user.gender ?? undefined,
    bodyFat: user.body_fat || undefined,
    goal: user.goal || undefined,
    workoutsPerWeek: user.workouts_per_week ?? undefined,
    averageDailySteps: user.average_daily_steps ?? undefined,
    occupationActivity: user.occupation_activity || undefined,

    muscleMass: user.muscle_mass ?? undefined,
    waterPercent: undefined,
    experienceLevel: user.role === 'trainer' ? 'Avanzado' : 'Intermedio',
    activityLevel: ACTIVITY_LABELS[user.activity_level || ''] || undefined,
    injuries: 'Sin registrar',
    weaknesses: 'Sin registrar',
    attendanceRate: user.role === 'client' ? 85 : 100,
    retentionRisk: 'Bajo',
    lastAttendance: 'Actualizado recientemente',
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