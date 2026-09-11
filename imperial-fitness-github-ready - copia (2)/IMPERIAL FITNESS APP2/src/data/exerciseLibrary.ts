import { safeGetItem, safeSetItem } from '../utils/safeStorage';
export type ExerciseDifficulty = 'Principiante' | 'Intermedio' | 'Avanzado';
export type ExerciseSource = 'imperial' | 'admin' | 'api' | 'local';

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  muscleGroup: string;
  primaryMuscle?: string;
  equipment?: string;
  difficulty?: ExerciseDifficulty;
  imageUrl?: string;
  instructions?: string;
  aliases?: string[];
  source?: ExerciseSource;
}

export const CUSTOM_EXERCISES_STORAGE_KEY = 'imperial_custom_exercises_v1';

export const EXERCISE_LIBRARY: ExerciseLibraryItem[] = 
[
  {
    "id": "abdomen-crunch-en-banco",
    "name": "Crunch en Banco",
    "muscleGroup": "Abdomen",
    "primaryMuscle": "abdomen",
    "equipment": "Banco / peso corporal",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/abdomen-crunch-en-banco.jpg",
    "instructions": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "abdomen-elevacion-de-piernas-con-mancuerna",
    "name": "Elevación de Piernas con Mancuerna",
    "muscleGroup": "Abdomen",
    "primaryMuscle": "abdomen",
    "equipment": "Mancuerna / banco",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/abdomen-elevacion-de-piernas-con-mancuerna.jpg",
    "instructions": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "abdomen-encogimiento-en-polea-alta",
    "name": "Encogimiento en Polea Alta",
    "muscleGroup": "Abdomen",
    "primaryMuscle": "abdomen",
    "equipment": "Polea alta",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/abdomen-encogimiento-en-polea-alta.jpg",
    "instructions": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "abdomen-escaladora-abdominal",
    "name": "Escaladora Abdominal",
    "muscleGroup": "Abdomen",
    "primaryMuscle": "abdomen",
    "equipment": "Peso corporal",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/abdomen-escaladora-abdominal.jpg",
    "instructions": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "abdomen-sit-ups",
    "name": "Sit Ups",
    "muscleGroup": "Abdomen",
    "primaryMuscle": "abdomen",
    "equipment": "Peso corporal",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/abdomen-sit-ups.jpg",
    "instructions": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "abdomen-crunch-abdominal-en-suelo",
    "name": "Crunch Abdominal en Suelo",
    "muscleGroup": "Abdomen",
    "primaryMuscle": "abdomen",
    "equipment": "Peso corporal",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/abdomen-crunch-abdominal-en-suelo.jpg",
    "instructions": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "oblicuos-crunch-oblicuo",
    "name": "Crunch Oblicuo",
    "muscleGroup": "Abdomen",
    "primaryMuscle": "oblicuos",
    "equipment": "Peso corporal",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/oblicuos-crunch-oblicuo.jpg",
    "instructions": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "oblicuos-plancha-lateral",
    "name": "Plancha Lateral",
    "muscleGroup": "Abdomen",
    "primaryMuscle": "oblicuos",
    "equipment": "Peso corporal",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/oblicuos-plancha-lateral.jpg",
    "instructions": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "abdomen-plancha-frontal",
    "name": "Plancha Frontal",
    "muscleGroup": "Abdomen",
    "primaryMuscle": "abdomen",
    "equipment": "Peso corporal",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/abdomen-plancha-frontal.jpg",
    "instructions": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "abdomen-rueda-abdominal-de-rodillas",
    "name": "Rueda Abdominal de Rodillas",
    "muscleGroup": "Abdomen",
    "primaryMuscle": "abdomen",
    "equipment": "Rueda abdominal",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/abdomen-rueda-abdominal-de-rodillas.jpg",
    "instructions": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "oblicuos-rotacion-de-tronco-en-polea",
    "name": "Rotación de Tronco en Polea",
    "muscleGroup": "Abdomen",
    "primaryMuscle": "oblicuos",
    "equipment": "Polea",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/oblicuos-rotacion-de-tronco-en-polea.jpg",
    "instructions": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "abdomen-elevacion-de-piernas-acostado",
    "name": "Elevación de Piernas Acostado",
    "muscleGroup": "Abdomen",
    "primaryMuscle": "abdomen",
    "equipment": "Peso corporal",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/abdomen-elevacion-de-piernas-acostado.jpg",
    "instructions": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "abdomen-crunch-inverso",
    "name": "Crunch Inverso",
    "muscleGroup": "Abdomen",
    "primaryMuscle": "abdomen",
    "equipment": "Peso corporal",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/abdomen-crunch-inverso.jpg",
    "instructions": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "abdomen-plancha-con-fitball",
    "name": "Plancha con Fitball",
    "muscleGroup": "Abdomen",
    "primaryMuscle": "abdomen",
    "equipment": "Fitball",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/abdomen-plancha-con-fitball.jpg",
    "instructions": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "oblicuos-lenador-con-balon-medicinal",
    "name": "Leñador con Balón Medicinal",
    "muscleGroup": "Abdomen",
    "primaryMuscle": "oblicuos",
    "equipment": "Balón medicinal",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/oblicuos-lenador-con-balon-medicinal.jpg",
    "instructions": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "biceps-curl-21",
    "name": "Curl 21",
    "muscleGroup": "Bíceps",
    "primaryMuscle": "bíceps",
    "equipment": "Mancuernas o barra",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/biceps-curl-21.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "biceps-curl-agarre-prono",
    "name": "Curl Agarre Prono",
    "muscleGroup": "Bíceps",
    "primaryMuscle": "bíceps",
    "equipment": "Barra",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/biceps-curl-agarre-prono.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "biceps-curl-banco-inclinado",
    "name": "Curl Banco Inclinado",
    "muscleGroup": "Bíceps",
    "primaryMuscle": "bíceps",
    "equipment": "Banco inclinado / mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/biceps-curl-banco-inclinado.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "biceps-curl-biceps-boca-abajo",
    "name": "Curl Bíceps Boca Abajo",
    "muscleGroup": "Bíceps",
    "primaryMuscle": "bíceps",
    "equipment": "Banco inclinado / mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/biceps-curl-biceps-boca-abajo.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "biceps-curl-martillo-cerrado-en-inclinado",
    "name": "Curl Martillo Cerrado en Inclinado",
    "muscleGroup": "Bíceps",
    "primaryMuscle": "bíceps",
    "equipment": "Banco inclinado / mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/biceps-curl-martillo-cerrado-en-inclinado.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "biceps-curl-predicador",
    "name": "Curl Predicador",
    "muscleGroup": "Bíceps",
    "primaryMuscle": "bíceps",
    "equipment": "Banco predicador",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/biceps-curl-predicador.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "biceps-curl-alto-en-polea-para-biceps",
    "name": "Curl Alto en Polea para Bíceps",
    "muscleGroup": "Bíceps",
    "primaryMuscle": "bíceps",
    "equipment": "Polea alta",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/biceps-curl-alto-en-polea-para-biceps.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "biceps-curl-arana-con-mancuerna",
    "name": "Curl Araña con Mancuerna",
    "muscleGroup": "Bíceps",
    "primaryMuscle": "bíceps",
    "equipment": "Banco inclinado / mancuerna",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/biceps-curl-arana-con-mancuerna.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "biceps-curl-alterno-sentado",
    "name": "Curl Alterno Sentado",
    "muscleGroup": "Bíceps",
    "primaryMuscle": "bíceps",
    "equipment": "Banco / mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/biceps-curl-alterno-sentado.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "biceps-curl-unilateral-en-polea-baja",
    "name": "Curl Unilateral en Polea Baja",
    "muscleGroup": "Bíceps",
    "primaryMuscle": "bíceps",
    "equipment": "Polea baja",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/biceps-curl-unilateral-en-polea-baja.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "biceps-curl-martillo-de-pie",
    "name": "Curl Martillo de Pie",
    "muscleGroup": "Bíceps",
    "primaryMuscle": "bíceps",
    "equipment": "Mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/biceps-curl-martillo-de-pie.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "biceps-curl-en-polea-baja",
    "name": "Curl en Polea Baja",
    "muscleGroup": "Bíceps",
    "primaryMuscle": "bíceps",
    "equipment": "Polea baja",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/biceps-curl-en-polea-baja.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "biceps-curl-en-maquina-predicador",
    "name": "Curl en Máquina Predicador",
    "muscleGroup": "Bíceps",
    "primaryMuscle": "bíceps",
    "equipment": "Máquina predicador",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/biceps-curl-en-maquina-predicador.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "biceps-curl-con-mancuernas-de-pie",
    "name": "Curl con Mancuernas de Pie",
    "muscleGroup": "Bíceps",
    "primaryMuscle": "bíceps",
    "equipment": "Mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/biceps-curl-con-mancuernas-de-pie.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "cardio-burpees",
    "name": "Burpees",
    "muscleGroup": "Cardio",
    "primaryMuscle": "cardio",
    "equipment": "Peso corporal",
    "difficulty": "Intermedio",
    "imageUrl": "/exercises/cardio-burpees.jpg",
    "instructions": "Mantén ritmo seguro, respiración continua y técnica estable durante todo el intervalo.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "cardio-saltos-con-cuerda",
    "name": "Saltos con Cuerda",
    "muscleGroup": "Cardio",
    "primaryMuscle": "cardio",
    "equipment": "Cuerda",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/cardio-saltos-con-cuerda.jpg",
    "instructions": "Mantén ritmo seguro, respiración continua y técnica estable durante todo el intervalo.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "cardio-skipping",
    "name": "Skipping",
    "muscleGroup": "Cardio",
    "primaryMuscle": "cardio",
    "equipment": "Peso corporal",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/cardio-skipping.jpg",
    "instructions": "Mantén ritmo seguro, respiración continua y técnica estable durante todo el intervalo.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "cardio-bicicleta-estatica",
    "name": "Bicicleta Estática",
    "muscleGroup": "Cardio",
    "primaryMuscle": "cardio",
    "equipment": "Bicicleta estática",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/cardio-bicicleta-estatica.jpg",
    "instructions": "Mantén ritmo seguro, respiración continua y técnica estable durante todo el intervalo.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "cardio-caminadora",
    "name": "Caminadora",
    "muscleGroup": "Cardio",
    "primaryMuscle": "cardio",
    "equipment": "Caminadora",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/cardio-caminadora.jpg",
    "instructions": "Mantén ritmo seguro, respiración continua y técnica estable durante todo el intervalo.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "cardio-soga-batida",
    "name": "Soga Batida",
    "muscleGroup": "Cardio",
    "primaryMuscle": "cardio",
    "equipment": "Soga de batalla",
    "difficulty": "Intermedio",
    "imageUrl": "/exercises/cardio-soga-batida.jpg",
    "instructions": "Mantén ritmo seguro, respiración continua y técnica estable durante todo el intervalo.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "espalda-remo-barra-t-en-maquina",
    "name": "Remo Barra T en Máquina",
    "muscleGroup": "Espalda",
    "primaryMuscle": "espalda",
    "equipment": "Máquina barra T",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/espalda-remo-barra-t-en-maquina.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "espalda-remo-barra-t-libre",
    "name": "Remo Barra T Libre",
    "muscleGroup": "Espalda",
    "primaryMuscle": "espalda",
    "equipment": "Barra T libre",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/espalda-remo-barra-t-libre.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "espalda-dominadas",
    "name": "Dominadas",
    "muscleGroup": "Espalda",
    "primaryMuscle": "espalda",
    "equipment": "Barra fija",
    "difficulty": "Intermedio",
    "imageUrl": "/exercises/espalda-dominadas.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "hombro-posterior-fly-posterior-en-maquina",
    "name": "Fly Posterior en Máquina",
    "muscleGroup": "Hombro",
    "primaryMuscle": "hombro posterior",
    "equipment": "Máquina peck deck inversa",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/hombro-posterior-fly-posterior-en-maquina.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "lumbar-hiperextension-lumbar",
    "name": "Hiperextensión Lumbar",
    "muscleGroup": "Espalda",
    "primaryMuscle": "lumbar",
    "equipment": "Banco romano",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/lumbar-hiperextension-lumbar.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "hombro-posterior-jalon-a-la-cara",
    "name": "Jalón a la Cara",
    "muscleGroup": "Hombro",
    "primaryMuscle": "hombro posterior",
    "equipment": "Polea",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/hombro-posterior-jalon-a-la-cara.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "espalda-pullover-en-polea",
    "name": "Pullover en Polea",
    "muscleGroup": "Espalda",
    "primaryMuscle": "espalda",
    "equipment": "Polea alta",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/espalda-pullover-en-polea.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "espalda-remo-agarre-supino",
    "name": "Remo Agarre Supino",
    "muscleGroup": "Espalda",
    "primaryMuscle": "espalda",
    "equipment": "Barra",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/espalda-remo-agarre-supino.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "espalda-remo-alto-agarre-v",
    "name": "Remo Alto Agarre V",
    "muscleGroup": "Espalda",
    "primaryMuscle": "espalda",
    "equipment": "Polea / agarre V",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/espalda-remo-alto-agarre-v.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "espalda-remo-bajo",
    "name": "Remo Bajo",
    "muscleGroup": "Espalda",
    "primaryMuscle": "espalda",
    "equipment": "Máquina o polea baja",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/espalda-remo-bajo.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "espalda-remo-con-mancuerna",
    "name": "Remo con Mancuerna",
    "muscleGroup": "Espalda",
    "primaryMuscle": "espalda",
    "equipment": "Banco / mancuerna",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/espalda-remo-con-mancuerna.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "espalda-remo-en-polea-con-barra",
    "name": "Remo en Polea con Barra",
    "muscleGroup": "Espalda",
    "primaryMuscle": "espalda",
    "equipment": "Polea baja / barra",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/espalda-remo-en-polea-con-barra.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "espalda-remo-inclinado",
    "name": "Remo Inclinado",
    "muscleGroup": "Espalda",
    "primaryMuscle": "espalda",
    "equipment": "Banco inclinado / mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/espalda-remo-inclinado.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "espalda-jalon-al-pecho-agarre-ancho",
    "name": "Jalón Al Pecho Agarre Ancho",
    "muscleGroup": "Espalda",
    "primaryMuscle": "espalda",
    "equipment": "Polea alta",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/espalda-jalon-al-pecho-agarre-ancho.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "espalda-jalon-al-pecho-agarre-cerrado",
    "name": "Jalón Al Pecho Agarre Cerrado",
    "muscleGroup": "Espalda",
    "primaryMuscle": "espalda",
    "equipment": "Polea alta / agarre cerrado",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/espalda-jalon-al-pecho-agarre-cerrado.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "espalda-remo-inclinado-con-mancuernas",
    "name": "Remo Inclinado con Mancuernas",
    "muscleGroup": "Espalda",
    "primaryMuscle": "espalda",
    "equipment": "Banco inclinado / mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/espalda-remo-inclinado-con-mancuernas.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "espalda-pullover-unilateral-en-polea",
    "name": "Pullover Unilateral en Polea",
    "muscleGroup": "Espalda",
    "primaryMuscle": "espalda",
    "equipment": "Polea",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/espalda-pullover-unilateral-en-polea.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "abductor-abduccion-de-cadera-en-polea",
    "name": "Abducción de Cadera en Polea",
    "muscleGroup": "Glúteo",
    "primaryMuscle": "abductor",
    "equipment": "Polea baja",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/abductor-abduccion-de-cadera-en-polea.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "gluteo-sentadilla-bulgara",
    "name": "Sentadilla Búlgara",
    "muscleGroup": "Glúteo",
    "primaryMuscle": "glúteo",
    "equipment": "Banco / barra o mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/gluteo-sentadilla-bulgara.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "gluteo-hip-thrust",
    "name": "Hip Thrust",
    "muscleGroup": "Glúteo",
    "primaryMuscle": "glúteo",
    "equipment": "Banco / barra",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/gluteo-hip-thrust.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "gluteo-patada-de-gluteo-en-polea",
    "name": "Patada de Glúteo en Polea",
    "muscleGroup": "Glúteo",
    "primaryMuscle": "glúteo",
    "equipment": "Polea baja",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/gluteo-patada-de-gluteo-en-polea.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "hombro-elevacion-frontal-con-mancuernas",
    "name": "Elevación Frontal con Mancuernas",
    "muscleGroup": "Hombro",
    "primaryMuscle": "hombro",
    "equipment": "Mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/hombro-elevacion-frontal-con-mancuernas.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "hombro-elevacion-frontal-en-inclinado",
    "name": "Elevación Frontal en Inclinado",
    "muscleGroup": "Hombro",
    "primaryMuscle": "hombro",
    "equipment": "Banco inclinado / mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/hombro-elevacion-frontal-en-inclinado.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "hombro-elevacion-frontal-en-polea",
    "name": "Elevación Frontal en Polea",
    "muscleGroup": "Hombro",
    "primaryMuscle": "hombro",
    "equipment": "Polea baja",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/hombro-elevacion-frontal-en-polea.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "hombro-elevacion-lateral-en-inclinado",
    "name": "Elevación Lateral en Inclinado",
    "muscleGroup": "Hombro",
    "primaryMuscle": "hombro",
    "equipment": "Banco inclinado / mancuerna",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/hombro-elevacion-lateral-en-inclinado.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "hombro-elevacion-lateral-unilateral",
    "name": "Elevación Lateral Unilateral",
    "muscleGroup": "Hombro",
    "primaryMuscle": "hombro",
    "equipment": "Mancuerna / banco inclinado",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/hombro-elevacion-lateral-unilateral.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "hombro-elevaciones-laterales",
    "name": "Elevaciones Laterales",
    "muscleGroup": "Hombro",
    "primaryMuscle": "hombro",
    "equipment": "Mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/hombro-elevaciones-laterales.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "hombro-posterior-fly-para-posterior",
    "name": "Fly para Posterior",
    "muscleGroup": "Hombro",
    "primaryMuscle": "hombro posterior",
    "equipment": "Polea o máquina",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/hombro-posterior-fly-para-posterior.jpg",
    "instructions": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "hombro-press-militar-en-maquina",
    "name": "Press Militar en Máquina",
    "muscleGroup": "Hombro",
    "primaryMuscle": "hombro",
    "equipment": "Máquina press hombro",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/hombro-press-militar-en-maquina.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "hombro-press-militar-con-mancuernas",
    "name": "Press Militar con Mancuernas",
    "muscleGroup": "Hombro",
    "primaryMuscle": "hombro",
    "equipment": "Banco / mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/hombro-press-militar-con-mancuernas.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "pantorrilla-elevacion-de-talones-en-maquina-de-pie",
    "name": "Elevación de Talones en Máquina de Pie",
    "muscleGroup": "Pantorrilla",
    "primaryMuscle": "pantorrilla",
    "equipment": "Máquina de pantorrilla",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/pantorrilla-elevacion-de-talones-en-maquina-de-pie.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "pantorrilla-elevacion-de-talones-con-mancuernas",
    "name": "Elevación de Talones con Mancuernas",
    "muscleGroup": "Pantorrilla",
    "primaryMuscle": "pantorrilla",
    "equipment": "Mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/pantorrilla-elevacion-de-talones-con-mancuernas.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "pantorrilla-elevacion-de-talones-en-step",
    "name": "Elevación de Talones en Step",
    "muscleGroup": "Pantorrilla",
    "primaryMuscle": "pantorrilla",
    "equipment": "Step",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/pantorrilla-elevacion-de-talones-en-step.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "pantorrilla-elevacion-de-talones-sentado-con-barra",
    "name": "Elevación de Talones Sentado con Barra",
    "muscleGroup": "Pantorrilla",
    "primaryMuscle": "pantorrilla",
    "equipment": "Banco / barra",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/pantorrilla-elevacion-de-talones-sentado-con-barra.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "pantorrilla-elevacion-de-talon-sentado-unilateral",
    "name": "Elevación de Talón Sentado Unilateral",
    "muscleGroup": "Pantorrilla",
    "primaryMuscle": "pantorrilla",
    "equipment": "Banco / disco",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/pantorrilla-elevacion-de-talon-sentado-unilateral.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "pantorrilla-elevacion-de-talones-en-step-con-mancuernas",
    "name": "Elevación de Talones en Step con Mancuernas",
    "muscleGroup": "Pantorrilla",
    "primaryMuscle": "pantorrilla",
    "equipment": "Step / mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/pantorrilla-elevacion-de-talones-en-step-con-mancuernas.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "pecho-apertura-en-plano-con-mancuernas",
    "name": "Apertura en Plano con Mancuernas",
    "muscleGroup": "Pecho",
    "primaryMuscle": "pecho",
    "equipment": "Banco plano / mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/pecho-apertura-en-plano-con-mancuernas.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "pecho-cruce-en-polea-alta",
    "name": "Cruce en Polea Alta",
    "muscleGroup": "Pecho",
    "primaryMuscle": "pecho",
    "equipment": "Poleas altas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/pecho-cruce-en-polea-alta.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "pecho-fly-en-maquina",
    "name": "Fly en Máquina",
    "muscleGroup": "Pecho",
    "primaryMuscle": "pecho",
    "equipment": "Máquina fly",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/pecho-fly-en-maquina.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "pecho-press-hammer-de-pecho",
    "name": "Press Hammer de Pecho",
    "muscleGroup": "Pecho",
    "primaryMuscle": "pecho",
    "equipment": "Máquina hammer",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/pecho-press-hammer-de-pecho.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "pecho-pec-deck",
    "name": "Pec Deck",
    "muscleGroup": "Pecho",
    "primaryMuscle": "pecho",
    "equipment": "Máquina pec deck",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/pecho-pec-deck.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "pecho-press-banca-con-mancuernas",
    "name": "Press Banca con Mancuernas",
    "muscleGroup": "Pecho",
    "primaryMuscle": "pecho",
    "equipment": "Banco plano / mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/pecho-press-banca-con-mancuernas.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "pecho-press-inclinado-con-mancuernas",
    "name": "Press Inclinado con Mancuernas",
    "muscleGroup": "Pecho",
    "primaryMuscle": "pecho",
    "equipment": "Banco inclinado / mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/pecho-press-inclinado-con-mancuernas.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "pecho-press-plano-cerrado",
    "name": "Press Plano Cerrado",
    "muscleGroup": "Pecho",
    "primaryMuscle": "pecho",
    "equipment": "Banco / mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/pecho-press-plano-cerrado.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "triceps-press-plano-para-triceps",
    "name": "Press Plano para Tríceps",
    "muscleGroup": "Tríceps",
    "primaryMuscle": "tríceps",
    "equipment": "Banco / barra",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/triceps-press-plano-para-triceps.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "pecho-cruce-en-polea-media",
    "name": "Cruce en Polea Media",
    "muscleGroup": "Pecho",
    "primaryMuscle": "pecho",
    "equipment": "Poleas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/pecho-cruce-en-polea-media.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "pecho-cruce-en-polea-baja-unilateral",
    "name": "Cruce en Polea Baja Unilateral",
    "muscleGroup": "Pecho",
    "primaryMuscle": "pecho",
    "equipment": "Polea baja",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/pecho-cruce-en-polea-baja-unilateral.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "aductor-en-maquina",
    "name": "Aductor en Máquina",
    "muscleGroup": "Pierna",
    "primaryMuscle": "aductor",
    "equipment": "Máquina aductora",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/aductor-en-maquina.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "aductor-en-polea",
    "name": "Aductor en Polea",
    "muscleGroup": "Pierna",
    "primaryMuscle": "aductor",
    "equipment": "Polea baja",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/aductor-en-polea.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "femoral-buenos-dias",
    "name": "Buenos Días",
    "muscleGroup": "Pierna",
    "primaryMuscle": "femoral",
    "equipment": "Barra",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/femoral-buenos-dias.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "cuadriceps-extension-de-cuadriceps",
    "name": "Extensión de Cuádriceps",
    "muscleGroup": "Pierna",
    "primaryMuscle": "cuádriceps",
    "equipment": "Máquina extensora",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/cuadriceps-extension-de-cuadriceps.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "femoral-curl-femoral-de-pie",
    "name": "Curl Femoral de Pie",
    "muscleGroup": "Pierna",
    "primaryMuscle": "femoral",
    "equipment": "Máquina femoral de pie",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/femoral-curl-femoral-de-pie.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "femoral-curl-femoral-en-polea",
    "name": "Curl Femoral en Polea",
    "muscleGroup": "Pierna",
    "primaryMuscle": "femoral",
    "equipment": "Polea baja",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/femoral-curl-femoral-en-polea.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "femoral-curl-femoral-sentado",
    "name": "Curl Femoral Sentado",
    "muscleGroup": "Pierna",
    "primaryMuscle": "femoral",
    "equipment": "Máquina femoral sentado",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/femoral-curl-femoral-sentado.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "femoral-curl-femoral-tumbado-con-mancuerna",
    "name": "Curl Femoral Tumbado con Mancuerna",
    "muscleGroup": "Pierna",
    "primaryMuscle": "femoral",
    "equipment": "Banco / mancuerna",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/femoral-curl-femoral-tumbado-con-mancuerna.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "cuadriceps-hacka-45-grados",
    "name": "Hacka 45 Grados",
    "muscleGroup": "Pierna",
    "primaryMuscle": "cuádriceps",
    "equipment": "Máquina hack",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/cuadriceps-hacka-45-grados.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "femoral-peso-muerto-con-barra",
    "name": "Peso Muerto con Barra",
    "muscleGroup": "Pierna",
    "primaryMuscle": "femoral",
    "equipment": "Barra",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/femoral-peso-muerto-con-barra.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "femoral-peso-muerto-rumano-con-mancuernas",
    "name": "Peso Muerto Rumano con Mancuernas",
    "muscleGroup": "Pierna",
    "primaryMuscle": "femoral",
    "equipment": "Mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/femoral-peso-muerto-rumano-con-mancuernas.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "cuadriceps-prensa-45-grados",
    "name": "Prensa 45 Grados",
    "muscleGroup": "Pierna",
    "primaryMuscle": "cuádriceps",
    "equipment": "Prensa 45 grados",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/cuadriceps-prensa-45-grados.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "cuadriceps-sancadas-con-mancuernas",
    "name": "Sancadas con Mancuernas",
    "muscleGroup": "Pierna",
    "primaryMuscle": "cuádriceps",
    "equipment": "Mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/cuadriceps-sancadas-con-mancuernas.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "cuadriceps-sentadilla-libre",
    "name": "Sentadilla Libre",
    "muscleGroup": "Pierna",
    "primaryMuscle": "cuádriceps",
    "equipment": "Barra",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/cuadriceps-sentadilla-libre.jpg",
    "instructions": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "triceps-copa-con-mancuerna",
    "name": "Copa con Mancuerna",
    "muscleGroup": "Tríceps",
    "primaryMuscle": "tríceps",
    "equipment": "Mancuerna",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/triceps-copa-con-mancuerna.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "triceps-extension-triceps-en-polea",
    "name": "Extensión Tríceps en Polea",
    "muscleGroup": "Tríceps",
    "primaryMuscle": "tríceps",
    "equipment": "Polea",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/triceps-extension-triceps-en-polea.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "triceps-flexion-para-triceps",
    "name": "Flexión para Tríceps",
    "muscleGroup": "Tríceps",
    "primaryMuscle": "tríceps",
    "equipment": "Peso corporal",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/triceps-flexion-para-triceps.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "triceps-extension-tras-nuca-en-polea",
    "name": "Extensión Tras Nuca en Polea",
    "muscleGroup": "Tríceps",
    "primaryMuscle": "tríceps",
    "equipment": "Polea",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/triceps-extension-tras-nuca-en-polea.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "triceps-extension-triceps-en-inclinado",
    "name": "Extensión Tríceps en Inclinado",
    "muscleGroup": "Tríceps",
    "primaryMuscle": "tríceps",
    "equipment": "Banco inclinado / mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/triceps-extension-triceps-en-inclinado.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "triceps-extension-por-encima-con-barra",
    "name": "Extensión Por Encima con Barra",
    "muscleGroup": "Tríceps",
    "primaryMuscle": "tríceps",
    "equipment": "Barra Z",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/triceps-extension-por-encima-con-barra.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "triceps-extension-por-encima-en-polea",
    "name": "Extensión Por Encima en Polea",
    "muscleGroup": "Tríceps",
    "primaryMuscle": "tríceps",
    "equipment": "Polea",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/triceps-extension-por-encima-en-polea.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "triceps-press-frances-acostado-con-barra",
    "name": "Press Francés Acostado con Barra",
    "muscleGroup": "Tríceps",
    "primaryMuscle": "tríceps",
    "equipment": "Banco / barra",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/triceps-press-frances-acostado-con-barra.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "triceps-jalon-de-triceps-en-polea",
    "name": "Jalón de Tríceps en Polea",
    "muscleGroup": "Tríceps",
    "primaryMuscle": "tríceps",
    "equipment": "Polea",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/triceps-jalon-de-triceps-en-polea.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "triceps-press-cerrado-con-barra",
    "name": "Press Cerrado con Barra",
    "muscleGroup": "Tríceps",
    "primaryMuscle": "tríceps",
    "equipment": "Banco / barra",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/triceps-press-cerrado-con-barra.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "triceps-fondos-en-maquina",
    "name": "Fondos en Máquina",
    "muscleGroup": "Tríceps",
    "primaryMuscle": "tríceps",
    "equipment": "Máquina de fondos",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/triceps-fondos-en-maquina.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "triceps-patada-de-triceps-con-mancuerna",
    "name": "Patada de Tríceps con Mancuerna",
    "muscleGroup": "Tríceps",
    "primaryMuscle": "tríceps",
    "equipment": "Banco / mancuerna",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/triceps-patada-de-triceps-con-mancuerna.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "triceps-extension-triceps-acostado-con-mancuernas",
    "name": "Extensión Tríceps Acostado con Mancuernas",
    "muscleGroup": "Tríceps",
    "primaryMuscle": "tríceps",
    "equipment": "Banco / mancuernas",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/triceps-extension-triceps-acostado-con-mancuernas.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  },
  {
    "id": "triceps-fondos-en-banco",
    "name": "Fondos en Banco",
    "muscleGroup": "Tríceps",
    "primaryMuscle": "tríceps",
    "equipment": "Banco",
    "difficulty": "Principiante",
    "imageUrl": "/exercises/triceps-fondos-en-banco.jpg",
    "instructions": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento.",
    "aliases": [],
    "source": "imperial"
  }
]
;


export const EXERCISE_GROUPS = Array.from(new Set(EXERCISE_LIBRARY.map((exercise) => exercise.muscleGroup))).sort();

function normalizeExerciseName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function safeReadStoredExercises(): ExerciseLibraryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = safeGetItem(CUSTOM_EXERCISES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistStoredExercises(exercises: ExerciseLibraryItem[]) {
  if (typeof window === 'undefined') return;
  try {
    safeSetItem(CUSTOM_EXERCISES_STORAGE_KEY, JSON.stringify(exercises));
  } catch {
    // localStorage may be unavailable; ignore gracefully.
  }
}

export function getFullExerciseCatalog(extraExercises: ExerciseLibraryItem[] = []): ExerciseLibraryItem[] {
  const merged = [...extraExercises, ...safeReadStoredExercises(), ...EXERCISE_LIBRARY];
  const byName = new Map<string, ExerciseLibraryItem>();
  merged.forEach((exercise) => {
    const key = normalizeExerciseName(exercise.name);
    if (!byName.has(key)) byName.set(key, exercise);
  });
  return Array.from(byName.values());
}

export function addCustomExercise(exercise: ExerciseLibraryItem): ExerciseLibraryItem[] {
  const stored = safeReadStoredExercises();
  const key = normalizeExerciseName(exercise.name);
  const next = [exercise, ...stored.filter((item) => normalizeExerciseName(item.name) !== key)];
  persistStoredExercises(next);
  return next;
}

export function findExerciseByName(name: string, extraExercises: ExerciseLibraryItem[] = []): ExerciseLibraryItem | undefined {
  const normalized = normalizeExerciseName(name);
  if (!normalized) return undefined;

  for (const item of getFullExerciseCatalog(extraExercises)) {
    const names = [item.name, ...(item.aliases || [])].map(normalizeExerciseName);
    if (names.some((candidate) => candidate === normalized || normalized.includes(candidate) || candidate.includes(normalized))) {
      return item;
    }
  }
  return undefined;
}
