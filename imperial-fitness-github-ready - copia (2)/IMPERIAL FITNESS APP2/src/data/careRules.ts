export type CareBodyArea = 'rodilla' | 'hombro' | 'lumbar' | 'codo' | 'muneca' | 'cadera' | 'tobillo' | 'cuello' | 'otro';
export type CareSeverity = 'leve' | 'moderada' | 'alta';

export interface UserLimitationInput {
  id?: string | number;
  userId?: string;
  bodyArea: CareBodyArea;
  severity: CareSeverity;
  comment?: string;
  trainerNote?: string;
  status?: 'active' | 'resolved';
}

export const BODY_AREA_LABELS: Record<CareBodyArea, string> = {
  rodilla: 'Rodilla',
  hombro: 'Hombro',
  lumbar: 'Zona lumbar',
  codo: 'Codo',
  muneca: 'Muñeca',
  cadera: 'Cadera',
  tobillo: 'Tobillo',
  cuello: 'Cuello',
  otro: 'Otra zona',
};

export const SEVERITY_LABELS: Record<CareSeverity, string> = {
  leve: 'Leve',
  moderada: 'Moderada',
  alta: 'Alta',
};

export function normalizeCareArea(value?: string): CareBodyArea {
  const cleaned = (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (cleaned.includes('rodilla')) return 'rodilla';
  if (cleaned.includes('hombro')) return 'hombro';
  if (cleaned.includes('lumbar') || cleaned.includes('espalda') || cleaned.includes('columna')) return 'lumbar';
  if (cleaned.includes('codo')) return 'codo';
  if (cleaned.includes('muneca') || cleaned.includes('muñeca')) return 'muneca';
  if (cleaned.includes('cadera')) return 'cadera';
  if (cleaned.includes('tobillo')) return 'tobillo';
  if (cleaned.includes('cuello') || cleaned.includes('cervical')) return 'cuello';
  return 'otro';
}

export function limitationSummary(limitations: UserLimitationInput[]): string {
  const active = limitations.filter(l => (l.status || 'active') === 'active');
  if (!active.length) return 'Sin molestias activas reportadas.';
  return active.map(l => `${BODY_AREA_LABELS[l.bodyArea]} (${SEVERITY_LABELS[l.severity]})`).join(' · ');
}

export function isHighCareSeverity(severity?: string) {
  return severity === 'alta';
}
