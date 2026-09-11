export type Role = 'admin' | 'trainer' | 'client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  tokens: number;
  plan?: string;
  assignedTrainerId?: string;
  weight?: number;
  height?: number;
  bodyFat?: number;
  goal?: string;
  streak?: number;
  status?: 'pending' | 'active' | 'suspended' | 'rejected';
}

export interface ProgressPhoto {
  id: string;
  url: string;
  date: string;
  weight: number;
  bodyFat: number;
  label: 'Frente' | 'Espalda' | 'Perfil' | 'Libre';
}

export interface ClientProfile extends User {
  age: number;
  gender: 'M' | 'F';
  muscleMass: number;
  waterPercent: number;
  experienceLevel: 'Principiante' | 'Intermedio' | 'Avanzado';
  activityLevel: 'Sedentario' | 'Ligero' | 'Moderado' | 'Intenso';
  injuries: string;
  weaknesses: string;
  attendanceRate: number;
  retentionRisk: 'Bajo' | 'Medio' | 'Alto';
  lastAttendance: string;
  progressPhotos?: ProgressPhoto[];
}

export interface DietMealItem {
  id: string;
  originalName: string;
  currentName: string;
  amountGrams: number;
  baseCarbsPer100g: number;
  baseCalsPer100g: number;
  category: 'protein' | 'carb' | 'fat' | 'veg' | 'drink';
}

export interface DietMeal {
  name: string;
  items: DietMealItem[];
  macros?: string;
}

export interface DietPlan {
  id: string;
  clientId: string;
  clientName: string;
  baseCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  goal: string;
  generatedDate: string;
  meals: DietMeal[];
  hydration: string;
  supplementation: string[];
  specialistDiagnosis: string;
}

export interface WorkoutRoutine {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  objective: string;
  generatedDate: string;
  days: {
    day: string;
    focus: string;
    exercises: {
      name: string;
      sets: number;
      reps: string;
      notes?: string;
    }[];
  }[];
  specialistAdvice: string;
}

export interface SocialPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorRole: Role;
  timeAgo: string;
  content: string;
  imageUrl?: string;
  likes: number;
  commentsCount: number;
  likedByMe: boolean;
  comments: { id: string; author: string; text: string; timeAgo: string }[];
  isTransformation?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSystemBot?: boolean;
}

export { FOOD_DATABASE, ROUTINE_TEMPLATES } from './foodDatabase';
export type { FoodItem, RoutineTemplate } from './foodDatabase';