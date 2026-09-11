export interface GymEquipmentItem {
  id: string;
  name: string;
  quantity: number;
  area: 'pierna' | 'superior' | 'cardio' | 'libre' | 'core';
  notes?: string;
}

export const IMPERIAL_GYM_EQUIPMENT: GymEquipmentItem[] = [
  { id: 'extensiones-cuadriceps', name: 'Extensión de cuádriceps', quantity: 3, area: 'pierna' },
  { id: 'femoral-acostado', name: 'Femoral acostado', quantity: 3, area: 'pierna' },
  { id: 'prensa-45', name: 'Prensa de 45 grados', quantity: 1, area: 'pierna' },
  { id: 'prensa-aerea', name: 'Prensa aérea', quantity: 1, area: 'pierna' },
  { id: 'jaca-squat', name: 'Jaca squat combinada', quantity: 1, area: 'pierna' },
  { id: 'hacka-45', name: 'Hacka 45 grados', quantity: 1, area: 'pierna' },
  { id: 'abductor-aductor', name: 'Abductor y aductor', quantity: 1, area: 'pierna' },
  { id: 'aductor', name: 'Aductor', quantity: 1, area: 'pierna' },
  { id: 'smith', name: 'Smith', quantity: 1, area: 'libre' },
  { id: 'femoral-pie-unilateral', name: 'Femoral de pie unilateral', quantity: 1, area: 'pierna' },
  { id: 'racks-sentadilla', name: 'Rack de sentadilla libre', quantity: 2, area: 'libre' },
  { id: 'mancuernas', name: 'Racks de mancuernas de 2 kg a 40 kg', quantity: 2, area: 'libre' },
  { id: 'banco-multiproposito', name: 'Banco multipropósito', quantity: 2, area: 'libre' },
  { id: 'banco-plano', name: 'Banco plano auxiliar', quantity: 3, area: 'libre' },
  { id: 'banco-declinado-barra', name: 'Banco declinado con barra', quantity: 1, area: 'superior' },
  { id: 'banco-inclinado-barra', name: 'Banco inclinado con barra', quantity: 1, area: 'superior' },
  { id: 'hammer', name: 'Hammer', quantity: 1, area: 'superior' },
  { id: 'fly-multiproposito', name: 'Fly multipropósito', quantity: 1, area: 'superior' },
  { id: 'pec-deck', name: 'Pec deck', quantity: 1, area: 'superior' },
  { id: 'barra-t', name: 'Barra T', quantity: 2, area: 'superior' },
  { id: 'fondos', name: 'Máquina de fondos', quantity: 1, area: 'superior' },
  { id: 'poleas-compactas', name: 'Poleas bajas y altas compactas', quantity: 1, area: 'superior' },
  { id: 'remo-alto', name: 'Remo alto', quantity: 2, area: 'superior' },
  { id: 'remo-bajo', name: 'Remo bajo', quantity: 2, area: 'superior' },
  { id: 'sissy', name: 'Sissy squat', quantity: 1, area: 'pierna' },
  { id: 'polea-alta', name: 'Polea alta', quantity: 1, area: 'superior' },
  { id: 'bicicletas', name: 'Bicicleta estática', quantity: 4, area: 'cardio' },
  { id: 'caminadora', name: 'Caminadora', quantity: 1, area: 'cardio' },
  { id: 'pantorrilla-sentado', name: 'Elevación de pantorrillas sentado', quantity: 1, area: 'pierna' },
  { id: 'pantorrilla-pie', name: 'Elevación de pantorrilla de pie', quantity: 1, area: 'pierna' },
  { id: 'femoral-sentado', name: 'Femoral sentado', quantity: 1, area: 'pierna' },
  { id: 'caminadora-curva', name: 'Caminadora curva mecánica', quantity: 1, area: 'cardio' },
];

export const IMPERIAL_EQUIPMENT_LABELS = IMPERIAL_GYM_EQUIPMENT.map(item => `${item.quantity} ${item.name}`);
