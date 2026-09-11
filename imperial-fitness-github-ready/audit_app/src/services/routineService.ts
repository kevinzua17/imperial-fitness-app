import { RoutineTemplate } from '../data/foodDatabase';
import { WorkoutRoutine } from '../data/mockData';
import { apiRequest } from './api';

function decodeHtmlEntities(value: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}
import { ApiRoutineTemplate, apiRoutineToRoutineTemplate } from './mappers';

export async function listRoutineTemplatesFromApi(goal?: string, level?: string): Promise<RoutineTemplate[]> {
  const params = new URLSearchParams();
  if (goal) params.set('goal', goal);
  if (level) params.set('level', level);

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const routines = await apiRequest<ApiRoutineTemplate[]>(`/routines/templates${suffix}`);
  return routines.map(apiRoutineToRoutineTemplate);
}



export interface RoutineTemplatePayload {
  title: string;
  target_goal: string;
  level: string;
  days_per_week: number;
  description?: string;
  trainer_rationale?: string;
  payload_json?: string;
}

export async function createRoutineTemplateInApi(payload: RoutineTemplatePayload): Promise<RoutineTemplate> {
  const row = await apiRequest<ApiRoutineTemplate>('/routines/templates', {
    method: 'POST',
    body: JSON.stringify({ ...payload, payload_json: payload.payload_json || '{}' }),
  });
  return apiRoutineToRoutineTemplate(row);
}

interface ApiAssignedRoutine {
  id: number;
  client_id: number;
  trainer_id?: number | null;
  title: string;
  objective: string;
  payload_json: string;
  active: number;
  created_at: string;
}

function apiAssignedToWorkoutRoutine(row: ApiAssignedRoutine): WorkoutRoutine {
  let parsed: Partial<WorkoutRoutine> = {};
  try {
    parsed = JSON.parse(row.payload_json || '{}');
  } catch {
    try {
      parsed = JSON.parse(decodeHtmlEntities(row.payload_json || '{}'));
    } catch {
      parsed = {};
    }
  }
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    clientName: parsed.clientName || `Cliente ${row.client_id}`,
    title: row.title,
    objective: row.objective,
    generatedDate: row.created_at.split('T')[0],
    days: parsed.days || [],
    specialistAdvice: parsed.specialistAdvice || 'Rutina asignada por entrenador Imperial Fitness.',
  };
}

export async function listAssignedRoutinesFromApi(clientId?: string): Promise<WorkoutRoutine[]> {
  const suffix = clientId ? `?client_id=${encodeURIComponent(clientId)}` : '';
  const rows = await apiRequest<ApiAssignedRoutine[]>(`/routines/assigned${suffix}`);
  return rows.map(apiAssignedToWorkoutRoutine);
}

export async function getMyAssignedRoutineFromApi(): Promise<WorkoutRoutine | null> {
  const row = await apiRequest<ApiAssignedRoutine | null>('/routines/assigned/my-routine');
  return row ? apiAssignedToWorkoutRoutine(row) : null;
}

export async function createAssignedRoutineInApi(routine: WorkoutRoutine): Promise<WorkoutRoutine> {
  const row = await apiRequest<ApiAssignedRoutine>('/routines/assigned', {
    method: 'POST',
    body: JSON.stringify({
      client_id: Number(routine.clientId),
      title: routine.title,
      objective: routine.objective,
      payload_json: JSON.stringify(routine),
      active: 1,
    }),
  });
  return apiAssignedToWorkoutRoutine(row);
}

export async function updateAssignedRoutineInApi(routineId: string, updates: Partial<WorkoutRoutine> & { active?: number }): Promise<WorkoutRoutine> {
  const body: Record<string, unknown> = {};
  if (updates.title !== undefined) body.title = updates.title;
  if (updates.objective !== undefined) body.objective = updates.objective;
  if (updates.days !== undefined || updates.specialistAdvice !== undefined || updates.clientName !== undefined) {
    body.payload_json = JSON.stringify(updates);
  }
  if (updates.active !== undefined) body.active = updates.active;

  const row = await apiRequest<ApiAssignedRoutine>(`/routines/assigned/${encodeURIComponent(routineId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return apiAssignedToWorkoutRoutine(row);
}

export async function deactivateAssignedRoutineInApi(routineId: string): Promise<void> {
  await apiRequest<{ ok: boolean }>(`/routines/assigned/${encodeURIComponent(routineId)}`, {
    method: 'DELETE',
  });
}
