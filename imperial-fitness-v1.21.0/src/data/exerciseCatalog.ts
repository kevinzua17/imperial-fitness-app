export type ExerciseSegment = 'superior' | 'inferior' | 'core' | 'cardio' | 'full_body';
export type ExerciseMovement = 'push' | 'pull' | 'legs' | 'hinge' | 'isolation' | 'core' | 'cardio' | 'full_body';
export type ExerciseLevel = 'todos' | 'principiante' | 'intermedio' | 'avanzado';
export type ExerciseMediaType = 'image' | 'animated-webp' | 'gif' | 'video' | 'open-source' | 'imperial-motion' | 'range-pair';
export interface ExerciseCatalogItem { id: string; name: string; segment: ExerciseSegment; movement: ExerciseMovement; primaryMuscle: string; muscleGroups: string[]; equipment: string; imageUrl?: string; imageStartUrl?: string; imageEndUrl?: string; alternateImageUrls?: string[]; animationUrl?: string; videoUrl?: string; mediaType?: ExerciseMediaType; mediaSource?: string; mediaLicense?: string; attribution?: string; mediaNotes?: string; techniqueSteps?: string[]; commonMistakes?: string[]; level: ExerciseLevel; isActive: boolean; isVisible?: boolean; isRoutineEligible?: boolean; reviewStatus?: 'pending' | 'approved' | 'rejected'; source?: string; needsImageReview?: boolean; coachingNotes?: string; }
export const EXERCISE_CATALOG: ExerciseCatalogItem[] = 
[
  {
    "id": "abdomen-crunch-en-banco",
    "name": "Crunch en Banco",
    "segment": "core",
    "movement": "core",
    "primaryMuscle": "abdomen",
    "muscleGroups": [
      "abdomen",
      "core"
    ],
    "equipment": "Banco / peso corporal",
    "imageUrl": "/exercises/abdomen-crunch-en-banco.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar."
  },
  {
    "id": "abdomen-elevacion-de-piernas-con-mancuerna",
    "name": "Elevación de Piernas con Mancuerna",
    "segment": "core",
    "movement": "core",
    "primaryMuscle": "abdomen",
    "muscleGroups": [
      "abdomen",
      "flexores de cadera",
      "core"
    ],
    "equipment": "Mancuerna / banco",
    "imageUrl": "/exercises/abdomen-elevacion-de-piernas-con-mancuerna.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar."
  },
  {
    "id": "abdomen-encogimiento-en-polea-alta",
    "name": "Encogimiento en Polea Alta",
    "segment": "core",
    "movement": "core",
    "primaryMuscle": "abdomen",
    "muscleGroups": [
      "abdomen",
      "core"
    ],
    "equipment": "Polea alta",
    "imageUrl": "/exercises/abdomen-encogimiento-en-polea-alta.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar."
  },
  {
    "id": "abdomen-escaladora-abdominal",
    "name": "Escaladora Abdominal",
    "segment": "core",
    "movement": "core",
    "primaryMuscle": "abdomen",
    "muscleGroups": [
      "abdomen",
      "core",
      "cardio"
    ],
    "equipment": "Peso corporal",
    "imageUrl": "/exercises/abdomen-escaladora-abdominal.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar."
  },
  {
    "id": "abdomen-sit-ups",
    "name": "Sit Ups",
    "segment": "core",
    "movement": "core",
    "primaryMuscle": "abdomen",
    "muscleGroups": [
      "abdomen",
      "core"
    ],
    "equipment": "Peso corporal",
    "imageUrl": "/exercises/abdomen-sit-ups.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar."
  },
  {
    "id": "abdomen-crunch-abdominal-en-suelo",
    "name": "Crunch Abdominal en Suelo",
    "segment": "core",
    "movement": "core",
    "primaryMuscle": "abdomen",
    "muscleGroups": [
      "abdomen",
      "core"
    ],
    "equipment": "Peso corporal",
    "imageUrl": "/exercises/abdomen-crunch-abdominal-en-suelo.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar."
  },
  {
    "id": "oblicuos-crunch-oblicuo",
    "name": "Crunch Oblicuo",
    "segment": "core",
    "movement": "core",
    "primaryMuscle": "oblicuos",
    "muscleGroups": [
      "oblicuos",
      "abdomen",
      "core"
    ],
    "equipment": "Peso corporal",
    "imageUrl": "/exercises/oblicuos-crunch-oblicuo.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar."
  },
  {
    "id": "oblicuos-plancha-lateral",
    "name": "Plancha Lateral",
    "segment": "core",
    "movement": "core",
    "primaryMuscle": "oblicuos",
    "muscleGroups": [
      "oblicuos",
      "abdomen",
      "core"
    ],
    "equipment": "Peso corporal",
    "imageUrl": "/exercises/oblicuos-plancha-lateral.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar."
  },
  {
    "id": "abdomen-plancha-frontal",
    "name": "Plancha Frontal",
    "segment": "core",
    "movement": "core",
    "primaryMuscle": "abdomen",
    "muscleGroups": [
      "abdomen",
      "core",
      "hombro"
    ],
    "equipment": "Peso corporal",
    "imageUrl": "/exercises/abdomen-plancha-frontal.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar."
  },
  {
    "id": "abdomen-rueda-abdominal-de-rodillas",
    "name": "Rueda Abdominal de Rodillas",
    "segment": "core",
    "movement": "core",
    "primaryMuscle": "abdomen",
    "muscleGroups": [
      "abdomen",
      "core",
      "dorsal"
    ],
    "equipment": "Rueda abdominal",
    "imageUrl": "/exercises/abdomen-rueda-abdominal-de-rodillas.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar."
  },
  {
    "id": "oblicuos-rotacion-de-tronco-en-polea",
    "name": "Rotación de Tronco en Polea",
    "segment": "core",
    "movement": "core",
    "primaryMuscle": "oblicuos",
    "muscleGroups": [
      "oblicuos",
      "abdomen",
      "core"
    ],
    "equipment": "Polea",
    "imageUrl": "/exercises/oblicuos-rotacion-de-tronco-en-polea.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar."
  },
  {
    "id": "abdomen-elevacion-de-piernas-acostado",
    "name": "Elevación de Piernas Acostado",
    "segment": "core",
    "movement": "core",
    "primaryMuscle": "abdomen",
    "muscleGroups": [
      "abdomen",
      "flexores de cadera",
      "core"
    ],
    "equipment": "Peso corporal",
    "imageUrl": "/exercises/abdomen-elevacion-de-piernas-acostado.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar."
  },
  {
    "id": "abdomen-crunch-inverso",
    "name": "Crunch Inverso",
    "segment": "core",
    "movement": "core",
    "primaryMuscle": "abdomen",
    "muscleGroups": [
      "abdomen",
      "core"
    ],
    "equipment": "Peso corporal",
    "imageUrl": "/exercises/abdomen-crunch-inverso.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar."
  },
  {
    "id": "abdomen-plancha-con-fitball",
    "name": "Plancha con Fitball",
    "segment": "core",
    "movement": "core",
    "primaryMuscle": "abdomen",
    "muscleGroups": [
      "abdomen",
      "core",
      "estabilizadores"
    ],
    "equipment": "Fitball",
    "imageUrl": "/exercises/abdomen-plancha-con-fitball.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar."
  },
  {
    "id": "oblicuos-lenador-con-balon-medicinal",
    "name": "Leñador con Balón Medicinal",
    "segment": "core",
    "movement": "core",
    "primaryMuscle": "oblicuos",
    "muscleGroups": [
      "oblicuos",
      "abdomen",
      "core",
      "hombro"
    ],
    "equipment": "Balón medicinal",
    "imageUrl": "/exercises/oblicuos-lenador-con-balon-medicinal.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Activa el core, respira de forma controlada y evita tensión excesiva en cuello o zona lumbar."
  },
  {
    "id": "biceps-curl-21",
    "name": "Curl 21",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "bíceps",
    "muscleGroups": [
      "bíceps",
      "braquial",
      "antebrazo"
    ],
    "equipment": "Mancuernas o barra",
    "imageUrl": "/exercises/biceps-curl-21.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "biceps-curl-agarre-prono",
    "name": "Curl Agarre Prono",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "bíceps",
    "muscleGroups": [
      "bíceps",
      "braquial",
      "antebrazo"
    ],
    "equipment": "Barra",
    "imageUrl": "/exercises/biceps-curl-agarre-prono.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "biceps-curl-banco-inclinado",
    "name": "Curl Banco Inclinado",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "bíceps",
    "muscleGroups": [
      "bíceps",
      "braquial"
    ],
    "equipment": "Banco inclinado / mancuernas",
    "imageUrl": "/exercises/biceps-curl-banco-inclinado.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "biceps-curl-biceps-boca-abajo",
    "name": "Curl Bíceps Boca Abajo",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "bíceps",
    "muscleGroups": [
      "bíceps",
      "braquial"
    ],
    "equipment": "Banco inclinado / mancuernas",
    "imageUrl": "/exercises/biceps-curl-biceps-boca-abajo.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "biceps-curl-martillo-cerrado-en-inclinado",
    "name": "Curl Martillo Cerrado en Inclinado",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "bíceps",
    "muscleGroups": [
      "bíceps",
      "braquial",
      "antebrazo"
    ],
    "equipment": "Banco inclinado / mancuernas",
    "imageUrl": "/exercises/biceps-curl-martillo-cerrado-en-inclinado.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "biceps-curl-predicador",
    "name": "Curl Predicador",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "bíceps",
    "muscleGroups": [
      "bíceps",
      "braquial"
    ],
    "equipment": "Banco predicador",
    "imageUrl": "/exercises/biceps-curl-predicador.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "biceps-curl-alto-en-polea-para-biceps",
    "name": "Curl Alto en Polea para Bíceps",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "bíceps",
    "muscleGroups": [
      "bíceps",
      "braquial"
    ],
    "equipment": "Polea alta",
    "imageUrl": "/exercises/biceps-curl-alto-en-polea-para-biceps.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "biceps-curl-arana-con-mancuerna",
    "name": "Curl Araña con Mancuerna",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "bíceps",
    "muscleGroups": [
      "bíceps",
      "braquial"
    ],
    "equipment": "Banco inclinado / mancuerna",
    "imageUrl": "/exercises/biceps-curl-arana-con-mancuerna.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "biceps-curl-alterno-sentado",
    "name": "Curl Alterno Sentado",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "bíceps",
    "muscleGroups": [
      "bíceps",
      "braquial"
    ],
    "equipment": "Banco / mancuernas",
    "imageUrl": "/exercises/biceps-curl-alterno-sentado.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "biceps-curl-unilateral-en-polea-baja",
    "name": "Curl Unilateral en Polea Baja",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "bíceps",
    "muscleGroups": [
      "bíceps",
      "braquial"
    ],
    "equipment": "Polea baja",
    "imageUrl": "/exercises/biceps-curl-unilateral-en-polea-baja.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "biceps-curl-martillo-de-pie",
    "name": "Curl Martillo de Pie",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "bíceps",
    "muscleGroups": [
      "bíceps",
      "braquial",
      "antebrazo"
    ],
    "equipment": "Mancuernas",
    "imageUrl": "/exercises/biceps-curl-martillo-de-pie.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "biceps-curl-en-polea-baja",
    "name": "Curl en Polea Baja",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "bíceps",
    "muscleGroups": [
      "bíceps",
      "braquial"
    ],
    "equipment": "Polea baja",
    "imageUrl": "/exercises/biceps-curl-en-polea-baja.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "biceps-curl-en-maquina-predicador",
    "name": "Curl en Máquina Predicador",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "bíceps",
    "muscleGroups": [
      "bíceps",
      "braquial"
    ],
    "equipment": "Máquina predicador",
    "imageUrl": "/exercises/biceps-curl-en-maquina-predicador.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "biceps-curl-con-mancuernas-de-pie",
    "name": "Curl con Mancuernas de Pie",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "bíceps",
    "muscleGroups": [
      "bíceps",
      "braquial"
    ],
    "equipment": "Mancuernas",
    "imageUrl": "/exercises/biceps-curl-con-mancuernas-de-pie.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "cardio-burpees",
    "name": "Burpees",
    "segment": "cardio",
    "movement": "cardio",
    "primaryMuscle": "cardio",
    "muscleGroups": [
      "cardio",
      "full body",
      "core"
    ],
    "equipment": "Peso corporal",
    "imageUrl": "/exercises/cardio-burpees.jpg",
    "level": "intermedio",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén ritmo seguro, respiración continua y técnica estable durante todo el intervalo."
  },
  {
    "id": "cardio-saltos-con-cuerda",
    "name": "Saltos con Cuerda",
    "segment": "cardio",
    "movement": "cardio",
    "primaryMuscle": "cardio",
    "muscleGroups": [
      "cardio",
      "pantorrilla"
    ],
    "equipment": "Cuerda",
    "imageUrl": "/exercises/cardio-saltos-con-cuerda.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén ritmo seguro, respiración continua y técnica estable durante todo el intervalo."
  },
  {
    "id": "cardio-skipping",
    "name": "Skipping",
    "segment": "cardio",
    "movement": "cardio",
    "primaryMuscle": "cardio",
    "muscleGroups": [
      "cardio",
      "core",
      "pierna"
    ],
    "equipment": "Peso corporal",
    "imageUrl": "/exercises/cardio-skipping.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén ritmo seguro, respiración continua y técnica estable durante todo el intervalo."
  },
  {
    "id": "cardio-bicicleta-estatica",
    "name": "Bicicleta Estática",
    "segment": "cardio",
    "movement": "cardio",
    "primaryMuscle": "cardio",
    "muscleGroups": [
      "cardio",
      "cuádriceps",
      "glúteo"
    ],
    "equipment": "Bicicleta estática",
    "imageUrl": "/exercises/cardio-bicicleta-estatica.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén ritmo seguro, respiración continua y técnica estable durante todo el intervalo."
  },
  {
    "id": "cardio-caminadora",
    "name": "Caminadora",
    "segment": "cardio",
    "movement": "cardio",
    "primaryMuscle": "cardio",
    "muscleGroups": [
      "cardio",
      "pierna"
    ],
    "equipment": "Caminadora",
    "imageUrl": "/exercises/cardio-caminadora.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén ritmo seguro, respiración continua y técnica estable durante todo el intervalo."
  },
  {
    "id": "cardio-soga-batida",
    "name": "Soga Batida",
    "segment": "cardio",
    "movement": "cardio",
    "primaryMuscle": "cardio",
    "muscleGroups": [
      "cardio",
      "hombro",
      "core"
    ],
    "equipment": "Soga de batalla",
    "imageUrl": "/exercises/cardio-soga-batida.jpg",
    "level": "intermedio",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén ritmo seguro, respiración continua y técnica estable durante todo el intervalo."
  },
  {
    "id": "espalda-remo-barra-t-en-maquina",
    "name": "Remo Barra T en Máquina",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "espalda",
    "muscleGroups": [
      "espalda",
      "dorsal",
      "romboides",
      "bíceps"
    ],
    "equipment": "Máquina barra T",
    "imageUrl": "/exercises/espalda-remo-barra-t-en-maquina.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "espalda-remo-barra-t-libre",
    "name": "Remo Barra T Libre",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "espalda",
    "muscleGroups": [
      "espalda",
      "dorsal",
      "romboides",
      "bíceps"
    ],
    "equipment": "Barra T libre",
    "imageUrl": "/exercises/espalda-remo-barra-t-libre.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "espalda-dominadas",
    "name": "Dominadas",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "espalda",
    "muscleGroups": [
      "espalda",
      "dorsal",
      "bíceps"
    ],
    "equipment": "Barra fija",
    "imageUrl": "/exercises/espalda-dominadas.jpg",
    "level": "intermedio",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "hombro-posterior-fly-posterior-en-maquina",
    "name": "Fly Posterior en Máquina",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "hombro posterior",
    "muscleGroups": [
      "hombro posterior",
      "trapecio",
      "romboides"
    ],
    "equipment": "Máquina peck deck inversa",
    "imageUrl": "/exercises/hombro-posterior-fly-posterior-en-maquina.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "lumbar-hiperextension-lumbar",
    "name": "Hiperextensión Lumbar",
    "segment": "core",
    "movement": "hinge",
    "primaryMuscle": "lumbar",
    "muscleGroups": [
      "lumbar",
      "glúteo",
      "femoral"
    ],
    "equipment": "Banco romano",
    "imageUrl": "/exercises/lumbar-hiperextension-lumbar.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "hombro-posterior-jalon-a-la-cara",
    "name": "Jalón a la Cara",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "hombro posterior",
    "muscleGroups": [
      "hombro posterior",
      "trapecio",
      "romboides"
    ],
    "equipment": "Polea",
    "imageUrl": "/exercises/hombro-posterior-jalon-a-la-cara.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "espalda-pullover-en-polea",
    "name": "Pullover en Polea",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "espalda",
    "muscleGroups": [
      "dorsal",
      "espalda",
      "core"
    ],
    "equipment": "Polea alta",
    "imageUrl": "/exercises/espalda-pullover-en-polea.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "espalda-remo-agarre-supino",
    "name": "Remo Agarre Supino",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "espalda",
    "muscleGroups": [
      "espalda",
      "dorsal",
      "bíceps"
    ],
    "equipment": "Barra",
    "imageUrl": "/exercises/espalda-remo-agarre-supino.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "espalda-remo-alto-agarre-v",
    "name": "Remo Alto Agarre V",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "espalda",
    "muscleGroups": [
      "espalda",
      "dorsal",
      "romboides"
    ],
    "equipment": "Polea / agarre V",
    "imageUrl": "/exercises/espalda-remo-alto-agarre-v.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "espalda-remo-bajo",
    "name": "Remo Bajo",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "espalda",
    "muscleGroups": [
      "espalda",
      "dorsal",
      "romboides",
      "bíceps"
    ],
    "equipment": "Máquina o polea baja",
    "imageUrl": "/exercises/espalda-remo-bajo.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "espalda-remo-con-mancuerna",
    "name": "Remo con Mancuerna",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "espalda",
    "muscleGroups": [
      "espalda",
      "dorsal",
      "romboides",
      "bíceps"
    ],
    "equipment": "Banco / mancuerna",
    "imageUrl": "/exercises/espalda-remo-con-mancuerna.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "espalda-remo-en-polea-con-barra",
    "name": "Remo en Polea con Barra",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "espalda",
    "muscleGroups": [
      "espalda",
      "dorsal",
      "romboides"
    ],
    "equipment": "Polea baja / barra",
    "imageUrl": "/exercises/espalda-remo-en-polea-con-barra.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "espalda-remo-inclinado",
    "name": "Remo Inclinado",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "espalda",
    "muscleGroups": [
      "espalda",
      "dorsal",
      "romboides"
    ],
    "equipment": "Banco inclinado / mancuernas",
    "imageUrl": "/exercises/espalda-remo-inclinado.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "espalda-jalon-al-pecho-agarre-ancho",
    "name": "Jalón Al Pecho Agarre Ancho",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "espalda",
    "muscleGroups": [
      "dorsal",
      "espalda",
      "bíceps"
    ],
    "equipment": "Polea alta",
    "imageUrl": "/exercises/espalda-jalon-al-pecho-agarre-ancho.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "espalda-jalon-al-pecho-agarre-cerrado",
    "name": "Jalón Al Pecho Agarre Cerrado",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "espalda",
    "muscleGroups": [
      "dorsal",
      "espalda",
      "bíceps"
    ],
    "equipment": "Polea alta / agarre cerrado",
    "imageUrl": "/exercises/espalda-jalon-al-pecho-agarre-cerrado.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "espalda-remo-inclinado-con-mancuernas",
    "name": "Remo Inclinado con Mancuernas",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "espalda",
    "muscleGroups": [
      "espalda",
      "dorsal",
      "romboides"
    ],
    "equipment": "Banco inclinado / mancuernas",
    "imageUrl": "/exercises/espalda-remo-inclinado-con-mancuernas.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "espalda-pullover-unilateral-en-polea",
    "name": "Pullover Unilateral en Polea",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "espalda",
    "muscleGroups": [
      "dorsal",
      "espalda",
      "core"
    ],
    "equipment": "Polea",
    "imageUrl": "/exercises/espalda-pullover-unilateral-en-polea.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "abductor-abduccion-de-cadera-en-polea",
    "name": "Abducción de Cadera en Polea",
    "segment": "inferior",
    "movement": "isolation",
    "primaryMuscle": "abductor",
    "muscleGroups": [
      "abductor",
      "glúteo medio"
    ],
    "equipment": "Polea baja",
    "imageUrl": "/exercises/abductor-abduccion-de-cadera-en-polea.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "gluteo-sentadilla-bulgara",
    "name": "Sentadilla Búlgara con Mancuernas",
    "segment": "inferior",
    "movement": "legs",
    "primaryMuscle": "glúteo",
    "muscleGroups": [
      "glúteo",
      "cuádriceps",
      "femoral"
    ],
    "equipment": "Banco / mancuernas",
    "imageUrl": "/exercises/gluteo-sentadilla-bulgara.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "gluteo-hip-thrust",
    "name": "Hip Thrust con Mancuerna",
    "segment": "inferior",
    "movement": "hinge",
    "primaryMuscle": "glúteo",
    "muscleGroups": [
      "glúteo",
      "femoral",
      "core"
    ],
    "equipment": "Banco / mancuerna",
    "imageUrl": "/exercises/gluteo-hip-thrust.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "gluteo-patada-de-gluteo-en-polea",
    "name": "Patada de Glúteo en Polea",
    "segment": "inferior",
    "movement": "isolation",
    "primaryMuscle": "glúteo",
    "muscleGroups": [
      "glúteo",
      "femoral"
    ],
    "equipment": "Polea baja",
    "imageUrl": "/exercises/gluteo-patada-de-gluteo-en-polea.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "hombro-elevacion-frontal-con-mancuernas",
    "name": "Elevación Frontal con Mancuernas",
    "segment": "superior",
    "movement": "isolation",
    "primaryMuscle": "hombro",
    "muscleGroups": [
      "hombro anterior",
      "deltoides"
    ],
    "equipment": "Mancuernas",
    "imageUrl": "/exercises/hombro-elevacion-frontal-con-mancuernas.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "hombro-elevacion-frontal-en-inclinado",
    "name": "Elevación Frontal en Inclinado",
    "segment": "superior",
    "movement": "isolation",
    "primaryMuscle": "hombro",
    "muscleGroups": [
      "hombro anterior",
      "deltoides"
    ],
    "equipment": "Banco inclinado / mancuernas",
    "imageUrl": "/exercises/hombro-elevacion-frontal-en-inclinado.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "hombro-elevacion-frontal-en-polea",
    "name": "Elevación Frontal en Polea",
    "segment": "superior",
    "movement": "isolation",
    "primaryMuscle": "hombro",
    "muscleGroups": [
      "hombro anterior",
      "deltoides"
    ],
    "equipment": "Polea baja",
    "imageUrl": "/exercises/hombro-elevacion-frontal-en-polea.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "hombro-elevacion-lateral-en-inclinado",
    "name": "Elevación Lateral en Inclinado",
    "segment": "superior",
    "movement": "isolation",
    "primaryMuscle": "hombro",
    "muscleGroups": [
      "hombro lateral",
      "deltoides"
    ],
    "equipment": "Banco inclinado / mancuerna",
    "imageUrl": "/exercises/hombro-elevacion-lateral-en-inclinado.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "hombro-elevacion-lateral-unilateral",
    "name": "Elevación Lateral Unilateral",
    "segment": "superior",
    "movement": "isolation",
    "primaryMuscle": "hombro",
    "muscleGroups": [
      "hombro lateral",
      "deltoides"
    ],
    "equipment": "Mancuerna / banco inclinado",
    "imageUrl": "/exercises/hombro-elevacion-lateral-unilateral.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "hombro-elevaciones-laterales",
    "name": "Elevaciones Laterales",
    "segment": "superior",
    "movement": "isolation",
    "primaryMuscle": "hombro",
    "muscleGroups": [
      "hombro lateral",
      "deltoides"
    ],
    "equipment": "Mancuernas",
    "imageUrl": "/exercises/hombro-elevaciones-laterales.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "hombro-posterior-fly-para-posterior",
    "name": "Fly para Posterior",
    "segment": "superior",
    "movement": "pull",
    "primaryMuscle": "hombro posterior",
    "muscleGroups": [
      "hombro posterior",
      "trapecio",
      "romboides"
    ],
    "equipment": "Polea o máquina",
    "imageUrl": "/exercises/hombro-posterior-fly-para-posterior.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Inicia la tracción con control escapular, evita balancear el tronco y controla la fase excéntrica."
  },
  {
    "id": "hombro-press-militar-en-maquina",
    "name": "Press Militar en Máquina",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "hombro",
    "muscleGroups": [
      "hombro",
      "tríceps",
      "deltoides"
    ],
    "equipment": "Máquina press hombro",
    "imageUrl": "/exercises/hombro-press-militar-en-maquina.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "hombro-press-militar-con-mancuernas",
    "name": "Press Militar con Mancuernas",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "hombro",
    "muscleGroups": [
      "hombro",
      "tríceps",
      "deltoides"
    ],
    "equipment": "Banco / mancuernas",
    "imageUrl": "/exercises/hombro-press-militar-con-mancuernas.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "pantorrilla-elevacion-de-talones-en-maquina-de-pie",
    "name": "Elevación de Talones en Máquina de Pie",
    "segment": "inferior",
    "movement": "isolation",
    "primaryMuscle": "pantorrilla",
    "muscleGroups": [
      "pantorrilla",
      "gemelos"
    ],
    "equipment": "Máquina de pantorrilla",
    "imageUrl": "/exercises/pantorrilla-elevacion-de-talones-en-maquina-de-pie.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "pantorrilla-elevacion-de-talones-con-mancuernas",
    "name": "Elevación de Talones con Mancuernas",
    "segment": "inferior",
    "movement": "isolation",
    "primaryMuscle": "pantorrilla",
    "muscleGroups": [
      "pantorrilla",
      "gemelos"
    ],
    "equipment": "Mancuernas",
    "imageUrl": "/exercises/pantorrilla-elevacion-de-talones-con-mancuernas.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "pantorrilla-elevacion-de-talones-en-step",
    "name": "Elevación de Talones en Step",
    "segment": "inferior",
    "movement": "isolation",
    "primaryMuscle": "pantorrilla",
    "muscleGroups": [
      "pantorrilla",
      "gemelos"
    ],
    "equipment": "Step",
    "imageUrl": "/exercises/pantorrilla-elevacion-de-talones-en-step.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "pantorrilla-elevacion-de-talones-sentado-con-barra",
    "name": "Elevación de Talones Sentado con Barra",
    "segment": "inferior",
    "movement": "isolation",
    "primaryMuscle": "pantorrilla",
    "muscleGroups": [
      "pantorrilla",
      "sóleo"
    ],
    "equipment": "Banco / barra",
    "imageUrl": "/exercises/pantorrilla-elevacion-de-talones-sentado-con-barra.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "pantorrilla-elevacion-de-talon-sentado-unilateral",
    "name": "Elevación de Talón Sentado Unilateral",
    "segment": "inferior",
    "movement": "isolation",
    "primaryMuscle": "pantorrilla",
    "muscleGroups": [
      "pantorrilla",
      "sóleo"
    ],
    "equipment": "Banco / disco",
    "imageUrl": "/exercises/pantorrilla-elevacion-de-talon-sentado-unilateral.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "pantorrilla-elevacion-de-talones-en-step-con-mancuernas",
    "name": "Elevación de Talones en Step con Mancuernas",
    "segment": "inferior",
    "movement": "isolation",
    "primaryMuscle": "pantorrilla",
    "muscleGroups": [
      "pantorrilla",
      "gemelos"
    ],
    "equipment": "Step / mancuernas",
    "imageUrl": "/exercises/pantorrilla-elevacion-de-talones-en-step-con-mancuernas.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "pecho-apertura-en-plano-con-mancuernas",
    "name": "Apertura en Plano con Mancuernas",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "pecho",
    "muscleGroups": [
      "pecho",
      "hombro anterior"
    ],
    "equipment": "Banco plano / mancuernas",
    "imageUrl": "/exercises/pecho-apertura-en-plano-con-mancuernas.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "pecho-cruce-en-polea-alta",
    "name": "Cruce en Polea Alta",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "pecho",
    "muscleGroups": [
      "pecho",
      "hombro anterior"
    ],
    "equipment": "Poleas altas",
    "imageUrl": "/exercises/pecho-cruce-en-polea-alta.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "pecho-fly-en-maquina",
    "name": "Fly en Máquina",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "pecho",
    "muscleGroups": [
      "pecho",
      "hombro anterior"
    ],
    "equipment": "Máquina fly",
    "imageUrl": "/exercises/pecho-fly-en-maquina.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "pecho-press-hammer-de-pecho",
    "name": "Press Hammer de Pecho",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "pecho",
    "muscleGroups": [
      "pecho",
      "tríceps",
      "hombro anterior"
    ],
    "equipment": "Máquina hammer",
    "imageUrl": "/exercises/pecho-press-hammer-de-pecho.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "pecho-pec-deck",
    "name": "Pec Deck",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "pecho",
    "muscleGroups": [
      "pecho",
      "hombro anterior"
    ],
    "equipment": "Máquina pec deck",
    "imageUrl": "/exercises/pecho-pec-deck.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "pecho-press-banca-con-mancuernas",
    "name": "Press Banca con Mancuernas",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "pecho",
    "muscleGroups": [
      "pecho",
      "tríceps",
      "hombro anterior"
    ],
    "equipment": "Banco plano / mancuernas",
    "imageUrl": "/exercises/pecho-press-banca-con-mancuernas.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "pecho-press-inclinado-con-mancuernas",
    "name": "Press Inclinado con Mancuernas",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "pecho",
    "muscleGroups": [
      "pecho superior",
      "tríceps",
      "hombro anterior"
    ],
    "equipment": "Banco inclinado / mancuernas",
    "imageUrl": "/exercises/pecho-press-inclinado-con-mancuernas.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "pecho-press-plano-cerrado",
    "name": "Press Plano Cerrado",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "pecho",
    "muscleGroups": [
      "pecho",
      "tríceps",
      "hombro anterior"
    ],
    "equipment": "Banco / mancuernas",
    "imageUrl": "/exercises/pecho-press-plano-cerrado.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "triceps-press-plano-para-triceps",
    "name": "Press Plano para Tríceps",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "tríceps",
    "muscleGroups": [
      "tríceps",
      "pecho",
      "hombro anterior"
    ],
    "equipment": "Banco / barra",
    "imageUrl": "/exercises/triceps-press-plano-para-triceps.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "pecho-cruce-en-polea-media",
    "name": "Cruce en Polea Media",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "pecho",
    "muscleGroups": [
      "pecho",
      "hombro anterior"
    ],
    "equipment": "Poleas",
    "imageUrl": "/exercises/pecho-cruce-en-polea-media.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "pecho-cruce-en-polea-baja-unilateral",
    "name": "Cruce en Polea Baja Unilateral",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "pecho",
    "muscleGroups": [
      "pecho superior",
      "hombro anterior"
    ],
    "equipment": "Polea baja",
    "imageUrl": "/exercises/pecho-cruce-en-polea-baja-unilateral.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "aductor-en-maquina",
    "name": "Aductor en Máquina",
    "segment": "inferior",
    "movement": "isolation",
    "primaryMuscle": "aductor",
    "muscleGroups": [
      "aductor",
      "pierna interna"
    ],
    "equipment": "Máquina aductora",
    "imageUrl": "/exercises/aductor-en-maquina.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "aductor-en-polea",
    "name": "Aductor en Polea",
    "segment": "inferior",
    "movement": "isolation",
    "primaryMuscle": "aductor",
    "muscleGroups": [
      "aductor",
      "pierna interna"
    ],
    "equipment": "Polea baja",
    "imageUrl": "/exercises/aductor-en-polea.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "femoral-buenos-dias",
    "name": "Buenos Días",
    "segment": "inferior",
    "movement": "hinge",
    "primaryMuscle": "femoral",
    "muscleGroups": [
      "femoral",
      "glúteo",
      "lumbar"
    ],
    "equipment": "Barra",
    "imageUrl": "/exercises/femoral-buenos-dias.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "cuadriceps-extension-de-cuadriceps",
    "name": "Extensión de Cuádriceps",
    "segment": "inferior",
    "movement": "isolation",
    "primaryMuscle": "cuádriceps",
    "muscleGroups": [
      "cuádriceps"
    ],
    "equipment": "Máquina extensora",
    "imageUrl": "/exercises/cuadriceps-extension-de-cuadriceps.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "femoral-curl-femoral-de-pie",
    "name": "Curl Femoral de Pie",
    "segment": "inferior",
    "movement": "isolation",
    "primaryMuscle": "femoral",
    "muscleGroups": [
      "femoral"
    ],
    "equipment": "Máquina femoral de pie",
    "imageUrl": "/exercises/femoral-curl-femoral-de-pie.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "femoral-curl-femoral-en-polea",
    "name": "Curl Femoral en Polea",
    "segment": "inferior",
    "movement": "isolation",
    "primaryMuscle": "femoral",
    "muscleGroups": [
      "femoral"
    ],
    "equipment": "Polea baja",
    "imageUrl": "/exercises/femoral-curl-femoral-en-polea.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "femoral-curl-femoral-sentado",
    "name": "Curl Femoral Sentado",
    "segment": "inferior",
    "movement": "isolation",
    "primaryMuscle": "femoral",
    "muscleGroups": [
      "femoral"
    ],
    "equipment": "Máquina femoral sentado",
    "imageUrl": "/exercises/femoral-curl-femoral-sentado.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "femoral-curl-femoral-tumbado-con-mancuerna",
    "name": "Curl Femoral Tumbado con Mancuerna",
    "segment": "inferior",
    "movement": "isolation",
    "primaryMuscle": "femoral",
    "muscleGroups": [
      "femoral",
      "glúteo"
    ],
    "equipment": "Banco / mancuerna",
    "imageUrl": "/exercises/femoral-curl-femoral-tumbado-con-mancuerna.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "cuadriceps-hacka-45-grados",
    "name": "Hacka 45 Grados",
    "segment": "inferior",
    "movement": "legs",
    "primaryMuscle": "cuádriceps",
    "muscleGroups": [
      "cuádriceps",
      "glúteo"
    ],
    "equipment": "Máquina hack",
    "imageUrl": "/exercises/cuadriceps-hacka-45-grados.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "femoral-peso-muerto-con-barra",
    "name": "Peso Muerto con Barra",
    "segment": "inferior",
    "movement": "hinge",
    "primaryMuscle": "femoral",
    "muscleGroups": [
      "femoral",
      "glúteo",
      "lumbar"
    ],
    "equipment": "Barra",
    "imageUrl": "/exercises/femoral-peso-muerto-con-barra.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "femoral-peso-muerto-rumano-con-mancuernas",
    "name": "Peso Muerto Rumano con Mancuernas",
    "segment": "inferior",
    "movement": "hinge",
    "primaryMuscle": "femoral",
    "muscleGroups": [
      "femoral",
      "glúteo",
      "lumbar"
    ],
    "equipment": "Mancuernas",
    "imageUrl": "/exercises/femoral-peso-muerto-rumano-con-mancuernas.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "cuadriceps-prensa-45-grados",
    "name": "Prensa 45 Grados",
    "segment": "inferior",
    "movement": "legs",
    "primaryMuscle": "cuádriceps",
    "muscleGroups": [
      "cuádriceps",
      "glúteo",
      "femoral"
    ],
    "equipment": "Prensa 45 grados",
    "imageUrl": "/exercises/cuadriceps-prensa-45-grados.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "cuadriceps-sancadas-con-mancuernas",
    "name": "Sancadas con Mancuernas",
    "segment": "inferior",
    "movement": "legs",
    "primaryMuscle": "cuádriceps",
    "muscleGroups": [
      "cuádriceps",
      "glúteo",
      "femoral"
    ],
    "equipment": "Mancuernas",
    "imageUrl": "/exercises/cuadriceps-sancadas-con-mancuernas.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "cuadriceps-sentadilla-libre",
    "name": "Sentadilla Libre",
    "segment": "inferior",
    "movement": "legs",
    "primaryMuscle": "cuádriceps",
    "muscleGroups": [
      "cuádriceps",
      "glúteo",
      "femoral",
      "core"
    ],
    "equipment": "Barra",
    "imageUrl": "/exercises/cuadriceps-sentadilla-libre.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Mantén alineación de rodillas, cadera y columna. Controla el rango y evita rebotes o compensaciones."
  },
  {
    "id": "triceps-copa-con-mancuerna",
    "name": "Copa con Mancuerna",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "tríceps",
    "muscleGroups": [
      "tríceps"
    ],
    "equipment": "Mancuerna",
    "imageUrl": "/exercises/triceps-copa-con-mancuerna.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "triceps-extension-triceps-en-polea",
    "name": "Extensión Tríceps en Polea",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "tríceps",
    "muscleGroups": [
      "tríceps"
    ],
    "equipment": "Polea",
    "imageUrl": "/exercises/triceps-extension-triceps-en-polea.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "triceps-flexion-para-triceps",
    "name": "Flexión para Tríceps",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "tríceps",
    "muscleGroups": [
      "tríceps",
      "pecho",
      "core"
    ],
    "equipment": "Peso corporal",
    "imageUrl": "/exercises/triceps-flexion-para-triceps.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "triceps-extension-tras-nuca-en-polea",
    "name": "Extensión Tras Nuca en Polea",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "tríceps",
    "muscleGroups": [
      "tríceps"
    ],
    "equipment": "Polea",
    "imageUrl": "/exercises/triceps-extension-tras-nuca-en-polea.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "triceps-extension-triceps-en-inclinado",
    "name": "Extensión Tríceps en Inclinado",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "tríceps",
    "muscleGroups": [
      "tríceps"
    ],
    "equipment": "Banco inclinado / mancuernas",
    "imageUrl": "/exercises/triceps-extension-triceps-en-inclinado.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "triceps-extension-por-encima-con-barra",
    "name": "Extensión Por Encima con Barra",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "tríceps",
    "muscleGroups": [
      "tríceps"
    ],
    "equipment": "Barra Z",
    "imageUrl": "/exercises/triceps-extension-por-encima-con-barra.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "triceps-extension-por-encima-en-polea",
    "name": "Extensión Por Encima en Polea",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "tríceps",
    "muscleGroups": [
      "tríceps"
    ],
    "equipment": "Polea",
    "imageUrl": "/exercises/triceps-extension-por-encima-en-polea.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "triceps-press-frances-acostado-con-barra",
    "name": "Press Francés Acostado con Barra",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "tríceps",
    "muscleGroups": [
      "tríceps"
    ],
    "equipment": "Banco / barra",
    "imageUrl": "/exercises/triceps-press-frances-acostado-con-barra.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "triceps-jalon-de-triceps-en-polea",
    "name": "Jalón de Tríceps en Polea",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "tríceps",
    "muscleGroups": [
      "tríceps"
    ],
    "equipment": "Polea",
    "imageUrl": "/exercises/triceps-jalon-de-triceps-en-polea.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "triceps-press-cerrado-con-barra",
    "name": "Press Cerrado con Barra",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "tríceps",
    "muscleGroups": [
      "tríceps",
      "pecho"
    ],
    "equipment": "Banco / barra",
    "imageUrl": "/exercises/triceps-press-cerrado-con-barra.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "triceps-fondos-en-maquina",
    "name": "Fondos en Máquina",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "tríceps",
    "muscleGroups": [
      "tríceps",
      "pecho"
    ],
    "equipment": "Máquina de fondos",
    "imageUrl": "/exercises/triceps-fondos-en-maquina.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "triceps-patada-de-triceps-con-mancuerna",
    "name": "Patada de Tríceps con Mancuerna",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "tríceps",
    "muscleGroups": [
      "tríceps"
    ],
    "equipment": "Banco / mancuerna",
    "imageUrl": "/exercises/triceps-patada-de-triceps-con-mancuerna.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "triceps-extension-triceps-acostado-con-mancuernas",
    "name": "Extensión Tríceps Acostado con Mancuernas",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "tríceps",
    "muscleGroups": [
      "tríceps"
    ],
    "equipment": "Banco / mancuernas",
    "imageUrl": "/exercises/triceps-extension-triceps-acostado-con-mancuernas.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  },
  {
    "id": "triceps-fondos-en-banco",
    "name": "Fondos en Banco",
    "segment": "superior",
    "movement": "push",
    "primaryMuscle": "tríceps",
    "muscleGroups": [
      "tríceps",
      "pecho",
      "hombro anterior"
    ],
    "equipment": "Banco",
    "imageUrl": "/exercises/triceps-fondos-en-banco.jpg",
    "level": "todos",
    "isActive": true,
    "needsImageReview": false,
    "coachingNotes": "Controla la fase de empuje, mantén hombros estables y evita bloquear articulaciones al final del movimiento."
  }
]
;

export function normalizeExerciseName(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function findExerciseByName(name: string, catalog: ExerciseCatalogItem[] = EXERCISE_CATALOG): ExerciseCatalogItem | undefined {
  const normalized = normalizeExerciseName(name);
  return catalog.find(ex => normalizeExerciseName(ex.name) === normalized) || catalog.find(ex => normalized.includes(normalizeExerciseName(ex.name)) || normalizeExerciseName(ex.name).includes(normalized));
}

export function mergeExerciseCatalog(apiItems: ExerciseCatalogItem[] | undefined): ExerciseCatalogItem[] {
  if (!apiItems || apiItems.length === 0) return EXERCISE_CATALOG;
  const normalizeKey = (value: string) => value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const sourceKey = (item: ExerciseCatalogItem) => (item.source || item.mediaSource || 'imperial').toLowerCase().includes('free-exercise-db')
    ? 'free-exercise-db'
    : 'imperial';
  const contentKey = (item: ExerciseCatalogItem) => `${sourceKey(item)}:${normalizeKey(item.name)}`;
  const byContent = new Map<string, ExerciseCatalogItem>();

  [...EXERCISE_CATALOG, ...apiItems].forEach(item => {
    const key = contentKey(item);
    const current = byContent.get(key);
    const itemIsPersisted = /^\d+$/.test(item.id);
    const currentIsPersisted = current ? /^\d+$/.test(current.id) : false;
    const preferred = itemIsPersisted || !currentIsPersisted ? item : current!;
    const supplemental = preferred === item ? current : item;
    byContent.set(key, {
      ...supplemental,
      ...preferred,
      imageUrl: preferred.imageUrl || supplemental?.imageUrl || '',
      imageStartUrl: preferred.imageStartUrl || supplemental?.imageStartUrl,
      imageEndUrl: preferred.imageEndUrl || supplemental?.imageEndUrl,
      alternateImageUrls: preferred.alternateImageUrls || supplemental?.alternateImageUrls,
      animationUrl: preferred.animationUrl || supplemental?.animationUrl,
      videoUrl: preferred.videoUrl || supplemental?.videoUrl,
      isActive: preferred.isActive !== false,
    });
  });
  return Array.from(byContent.values()).filter(item => item.isActive !== false);
}
