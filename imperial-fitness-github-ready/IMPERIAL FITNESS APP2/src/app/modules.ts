import type { Role } from '../data/mockData';

export type ModuleId =
  | 'dashboard'
  | 'profile'
  | 'clients'
  | 'personal_plan'
  | 'progress_hub'
  | 'coach_hub'
  | 'timer'
  | 'exercises'
  | 'imperial_path'
  | 'social'
  | 'chat'
  | 'history'
  | 'friends'
  | 'photos'
  | 'tokens'
  | 'body_metrics'
  | 'challenges'
  | 'membership'
  | 'recovery'
  | 'sync'
  | 'specialist_assistant'
  | 'user_management'
  | 'implementation'
  | 'finance';

export interface AppModuleDefinition {
  id: ModuleId;
  roles: Role[];
  labels: Partial<Record<Role, string>> & { default: string };
  group: 'core' | 'coaching' | 'community' | 'admin' | 'system';
  clientPrimary?: boolean;
  devOnly?: boolean;
}

/**
 * Única fuente de verdad para navegación y permisos visuales.
 *
 * v1.21.0 mantiene todos los módulos existentes para staff, pero el cliente ve
 * solo los cinco trabajos que realmente necesita completar: Hoy, Mi plan,
 * Progreso, Mi coach y Perfil. Las funciones antiguas siguen vivas y se
 * integran dentro de esos hubs en vez de competir por atención en el menú.
 */
export const APP_MODULES: AppModuleDefinition[] = [
  { id: 'dashboard', roles: ['admin', 'trainer', 'client'], labels: { default: 'Inicio', client: 'Hoy' }, group: 'core', clientPrimary: true },
  { id: 'personal_plan', roles: ['admin', 'trainer', 'client'], labels: { default: 'Planes', client: 'Mi plan' }, group: 'core', clientPrimary: true },
  { id: 'progress_hub', roles: ['client'], labels: { default: 'Progreso', client: 'Progreso' }, group: 'core', clientPrimary: true },
  { id: 'coach_hub', roles: ['client'], labels: { default: 'Mi coach', client: 'Mi coach' }, group: 'core', clientPrimary: true },
  { id: 'profile', roles: ['admin', 'trainer', 'client'], labels: { default: 'Perfil' }, group: 'core', clientPrimary: true },

  { id: 'clients', roles: ['admin', 'trainer'], labels: { default: 'Clientes' }, group: 'coaching' },
  { id: 'exercises', roles: ['admin', 'trainer'], labels: { default: 'Ejercicios' }, group: 'coaching' },
  { id: 'body_metrics', roles: ['admin', 'trainer'], labels: { default: 'Seguimiento' }, group: 'coaching' },
  { id: 'history', roles: ['admin', 'trainer'], labels: { default: 'Historial' }, group: 'coaching' },
  { id: 'photos', roles: ['admin', 'trainer'], labels: { default: 'Fotos de progreso' }, group: 'coaching' },
  { id: 'specialist_assistant', roles: ['admin', 'trainer'], labels: { default: 'Asistente Coach' }, group: 'coaching' },

  { id: 'imperial_path', roles: ['admin', 'trainer'], labels: { default: 'Control Imperial' }, group: 'community' },
  { id: 'social', roles: ['admin', 'trainer'], labels: { default: 'Comunidad' }, group: 'community' },
  { id: 'chat', roles: ['admin', 'trainer'], labels: { default: 'Chat' }, group: 'community' },
  { id: 'challenges', roles: ['admin', 'trainer'], labels: { default: 'Reto 8 semanas' }, group: 'community' },
  { id: 'timer', roles: ['admin', 'trainer'], labels: { default: 'Timer' }, group: 'community' },

  { id: 'membership', roles: ['admin'], labels: { default: 'Membresías' }, group: 'admin' },
  { id: 'finance', roles: ['admin'], labels: { default: 'Financiero' }, group: 'admin' },
  { id: 'recovery', roles: ['admin'], labels: { default: 'Recuperación' }, group: 'system' },
  { id: 'sync', roles: ['admin'], labels: { default: 'Actividad' }, group: 'system' },
  { id: 'user_management', roles: ['admin'], labels: { default: 'Accesos' }, group: 'system' },
  { id: 'implementation', roles: ['admin'], labels: { default: 'Implementación' }, group: 'system', devOnly: true },

  // IDs históricos conservados deliberadamente para no romper enlaces viejos.
  // No se muestran al cliente desde v1.21.0; App redirige esos accesos a sus hubs.
  { id: 'friends', roles: [], labels: { default: 'Red social' }, group: 'community' },
  { id: 'tokens', roles: [], labels: { default: 'Recompensas' }, group: 'community' },
];

export const LEGACY_CLIENT_REDIRECTS: Record<string, ModuleId> = {
  timer: 'personal_plan',
  exercises: 'personal_plan',
  imperial_path: 'dashboard',
  social: 'dashboard',
  chat: 'coach_hub',
  history: 'progress_hub',
  friends: 'dashboard',
  photos: 'progress_hub',
  tokens: 'dashboard',
  body_metrics: 'progress_hub',
  challenges: 'dashboard',
  membership: 'profile',
};

export function moduleLabel(module: AppModuleDefinition, role: Role): string {
  return module.labels[role] || module.labels.default;
}

export function getAllowedModules(role: Role, devMode = false): AppModuleDefinition[] {
  return APP_MODULES.filter(module => module.roles.includes(role) && (!module.devOnly || devMode));
}

export function getAllowedModuleIds(role: Role, devMode = false): string[] {
  return getAllowedModules(role, devMode).map(module => module.id);
}

export function normalizeRequestedModule(tab: string, role: Role): string {
  if (role !== 'client') return tab;
  return LEGACY_CLIENT_REDIRECTS[tab] || tab;
}
