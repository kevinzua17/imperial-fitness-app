import type { Role } from '../data/mockData';

export type ModuleId =
  | 'dashboard'
  | 'profile'
  | 'clients'
  | 'personal_plan'
  | 'progress_hub'
  | 'coach_hub'
  | 'staff_hub'
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
  /** Si es false, el módulo sigue siendo accesible desde hubs internos pero no ocupa espacio en el menú principal. */
  navVisible?: boolean;
  devOnly?: boolean;
}

/**
 * Fuente única de verdad para permisos y navegación.
 *
 * v1.21.1 simplifica también la experiencia del staff:
 * - Cliente: Hoy, Mi plan, Progreso, Mi coach, Perfil.
 * - Coach/Admin: Inicio, Clientes, Planes, Centro de gestión, Perfil.
 *
 * Los módulos históricos siguen autorizados por rol para no romper rutas ni
 * herramientas existentes, pero se acceden desde el Centro de gestión.
 */
export const APP_MODULES: AppModuleDefinition[] = [
  { id: 'dashboard', roles: ['admin', 'trainer', 'client'], labels: { default: 'Inicio', client: 'Hoy' }, group: 'core', clientPrimary: true },
  { id: 'clients', roles: ['admin', 'trainer'], labels: { default: 'Clientes' }, group: 'core' },
  { id: 'personal_plan', roles: ['admin', 'trainer', 'client'], labels: { default: 'Planes', client: 'Mi plan' }, group: 'core', clientPrimary: true },
  { id: 'staff_hub', roles: ['admin', 'trainer'], labels: { default: 'Centro de gestión', trainer: 'Herramientas coach' }, group: 'core' },
  { id: 'progress_hub', roles: ['client'], labels: { default: 'Progreso', client: 'Progreso' }, group: 'core', clientPrimary: true },
  { id: 'coach_hub', roles: ['client'], labels: { default: 'Mi coach', client: 'Mi coach' }, group: 'core', clientPrimary: true },
  { id: 'profile', roles: ['admin', 'trainer', 'client'], labels: { default: 'Perfil' }, group: 'core', clientPrimary: true },

  // Herramientas profesionales: accesibles desde Centro de gestión, ocultas del menú principal.
  { id: 'exercises', roles: ['admin', 'trainer'], labels: { default: 'Ejercicios' }, group: 'coaching', navVisible: false },
  { id: 'body_metrics', roles: ['admin', 'trainer'], labels: { default: 'Seguimiento' }, group: 'coaching', navVisible: false },
  { id: 'history', roles: ['admin', 'trainer'], labels: { default: 'Historial' }, group: 'coaching', navVisible: false },
  { id: 'photos', roles: ['admin', 'trainer'], labels: { default: 'Fotos de progreso' }, group: 'coaching', navVisible: false },
  { id: 'specialist_assistant', roles: ['admin', 'trainer'], labels: { default: 'Asistente Coach' }, group: 'coaching', navVisible: false },
  { id: 'imperial_path', roles: ['admin', 'trainer'], labels: { default: 'Control Imperial' }, group: 'community', navVisible: false },
  { id: 'social', roles: ['admin', 'trainer'], labels: { default: 'Comunidad' }, group: 'community', navVisible: false },
  { id: 'chat', roles: ['admin', 'trainer'], labels: { default: 'Chat' }, group: 'community', navVisible: false },
  { id: 'challenges', roles: ['admin', 'trainer'], labels: { default: 'Reto 8 semanas' }, group: 'community', navVisible: false },
  { id: 'timer', roles: ['admin', 'trainer'], labels: { default: 'Timer' }, group: 'community', navVisible: false },

  // Herramientas administrativas: accesibles desde Centro de gestión.
  { id: 'membership', roles: ['admin'], labels: { default: 'Membresías' }, group: 'admin', navVisible: false },
  { id: 'finance', roles: ['admin'], labels: { default: 'Financiero' }, group: 'admin', navVisible: false },
  { id: 'recovery', roles: ['admin'], labels: { default: 'Recuperación' }, group: 'system', navVisible: false },
  { id: 'sync', roles: ['admin'], labels: { default: 'Actividad' }, group: 'system', navVisible: false },
  { id: 'user_management', roles: ['admin'], labels: { default: 'Accesos' }, group: 'system', navVisible: false },
  { id: 'implementation', roles: ['admin'], labels: { default: 'Implementación' }, group: 'system', navVisible: false, devOnly: true },

  // IDs históricos conservados para no romper enlaces viejos.
  { id: 'friends', roles: [], labels: { default: 'Red social' }, group: 'community', navVisible: false },
  { id: 'tokens', roles: [], labels: { default: 'Recompensas' }, group: 'community', navVisible: false },
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

/** Módulos autorizados. Incluye los ocultos que se abren desde hubs. */
export function getAllowedModules(role: Role, devMode = false): AppModuleDefinition[] {
  return APP_MODULES.filter(module => module.roles.includes(role) && (!module.devOnly || devMode));
}

/** Módulos que realmente deben ocupar espacio en la navegación principal. */
export function getNavigationModules(role: Role, devMode = false): AppModuleDefinition[] {
  return getAllowedModules(role, devMode).filter(module => module.navVisible !== false);
}

export function getAllowedModuleIds(role: Role, devMode = false): string[] {
  return getAllowedModules(role, devMode).map(module => module.id);
}

export function normalizeRequestedModule(tab: string, role: Role): string {
  if (role !== 'client') return tab;
  return LEGACY_CLIENT_REDIRECTS[tab] || tab;
}
