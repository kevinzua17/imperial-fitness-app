import type { RoutineTemplate } from './foodDatabase';

export const VISUAL_ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    "id": "visual-push-basic",
    "title": "Imperial Push Visual: Pecho, Hombro y Tríceps",
    "targetGoal": "Hipertrofia",
    "level": "Intermedio",
    "daysPerWeek": 1,
    "description": "Sesión visual de empuje para trabajar pecho, hombros y tríceps usando ejercicios con imagen de referencia.",
    "trainerRationale": "Ideal para usuarios que necesitan claridad técnica y mayor adherencia visual. Combina empujes pesados, aperturas y aislamiento.",
    "days": [
      {
        "day": "Día 1: Empuje",
        "focus": "Pecho, hombro anterior y tríceps",
        "warmup": "5 min caminadora + movilidad de hombros + 2 series livianas de press",
        "exercises": [
          {
            "name": "Press Banca",
            "sets": 4,
            "reps": "8-10",
            "rest": "90s",
            "notes": "Controla la bajada y no rebotes la barra."
          },
          {
            "name": "Press Inclinado",
            "sets": 4,
            "reps": "10-12",
            "rest": "75s",
            "notes": "Enfoca pectoral superior."
          },
          {
            "name": "Cruce en Polea Alta",
            "sets": 3,
            "reps": "12-15",
            "rest": "60s",
            "notes": "Aprieta el pecho al centro."
          },
          {
            "name": "Press Militar",
            "sets": 3,
            "reps": "8-10",
            "rest": "90s",
            "notes": "Core firme, sin arquear la espalda."
          },
          {
            "name": "Elevaciones Laterales",
            "sets": 3,
            "reps": "15",
            "rest": "45s",
            "notes": "Sube controlado hasta línea de hombro."
          },
          {
            "name": "Extensión Tríceps",
            "sets": 4,
            "reps": "12",
            "rest": "45s",
            "notes": "Codos fijos."
          }
        ],
        "cooldown": "Estiramientos suaves de pecho, hombro y tríceps."
      }
    ]
  },
  {
    "id": "visual-pull-basic",
    "title": "Imperial Pull Visual: Espalda y Bíceps",
    "targetGoal": "Hipertrofia",
    "level": "Intermedio",
    "daysPerWeek": 1,
    "description": "Sesión visual de tracción para espalda completa y bíceps con apoyo gráfico.",
    "trainerRationale": "Alterna jalones, remos y curls para mejorar dorsales, espalda media y brazos sin saturar la zona lumbar.",
    "days": [
      {
        "day": "Día 1: Tracción",
        "focus": "Espalda, deltoide posterior y bíceps",
        "warmup": "Movilidad torácica + 2 series suaves de remo bajo",
        "exercises": [
          {
            "name": "Dominadas",
            "sets": 4,
            "reps": "Máximas controladas",
            "rest": "90s",
            "notes": "Usa asistencia si hace falta."
          },
          {
            "name": "Remo Bajo",
            "sets": 4,
            "reps": "10-12",
            "rest": "75s",
            "notes": "Pausa un segundo atrás."
          },
          {
            "name": "Barra T",
            "sets": 4,
            "reps": "8-10",
            "rest": "90s",
            "notes": "Pecho firme contra el apoyo si aplica."
          },
          {
            "name": "Jalón a la Cara",
            "sets": 3,
            "reps": "15-20",
            "rest": "45s",
            "notes": "Cuida hombros y deltoide posterior."
          },
          {
            "name": "Curl Banco Inclinado",
            "sets": 3,
            "reps": "10-12",
            "rest": "60s",
            "notes": "Estira sin perder control."
          },
          {
            "name": "Hammer",
            "sets": 3,
            "reps": "12",
            "rest": "45s",
            "notes": "Agarre neutro."
          }
        ],
        "cooldown": "Estiramientos de dorsal, bíceps y trapecio."
      }
    ]
  },
  {
    "id": "visual-legs-quads",
    "title": "Imperial Pierna Visual: Cuádriceps Dominante",
    "targetGoal": "Hipertrofia",
    "level": "Intermedio",
    "daysPerWeek": 1,
    "description": "Rutina visual para pierna con prioridad en cuádriceps, técnica y congestión.",
    "trainerRationale": "Combina patrones de sentadilla, prensa y extensión para estimular cuádriceps con control articular.",
    "days": [
      {
        "day": "Día 1: Pierna A",
        "focus": "Cuádriceps, aductores y pantorrilla",
        "warmup": "Bicicleta 8 min + movilidad de rodilla y cadera",
        "exercises": [
          {
            "name": "Sentadilla",
            "sets": 4,
            "reps": "8-10",
            "rest": "120s",
            "notes": "Profundidad segura y espalda firme."
          },
          {
            "name": "Hacka 45°",
            "sets": 4,
            "reps": "10-12",
            "rest": "90s",
            "notes": "Pies a ancho de hombros."
          },
          {
            "name": "Prensa 45°",
            "sets": 4,
            "reps": "12",
            "rest": "90s",
            "notes": "No bloquees rodillas."
          },
          {
            "name": "Extensión Cuadriceps",
            "sets": 4,
            "reps": "15",
            "rest": "60s",
            "notes": "Pausa arriba."
          },
          {
            "name": "Aductor",
            "sets": 3,
            "reps": "15",
            "rest": "45s",
            "notes": "Control sin rebote."
          },
          {
            "name": "Elevación de Pantorrilla Sentado",
            "sets": 4,
            "reps": "15-20",
            "rest": "45s",
            "notes": "Rango completo."
          }
        ],
        "cooldown": "Estiramiento de cuádriceps, aductores y gemelos."
      }
    ]
  },
  {
    "id": "visual-glute-ham",
    "title": "Imperial Glúteo e Isquios Visual",
    "targetGoal": "Glúteo / Tonificación",
    "level": "Intermedio",
    "daysPerWeek": 1,
    "description": "Rutina visual enfocada en glúteos e isquiotibiales con ejercicios de gimnasio.",
    "trainerRationale": "Prioriza extensión de cadera y flexión de rodilla para mejorar glúteo, cadena posterior y estabilidad.",
    "days": [
      {
        "day": "Día 1: Cadena posterior",
        "focus": "Glúteo, femoral y core",
        "warmup": "Activación de glúteo + caminata inclinada 6 min",
        "exercises": [
          {
            "name": "Hip Thrust",
            "sets": 4,
            "reps": "10-12",
            "rest": "90s",
            "notes": "Pausa arriba 2 segundos."
          },
          {
            "name": "Peso Muerto",
            "sets": 4,
            "reps": "8-10",
            "rest": "120s",
            "notes": "Espalda neutra."
          },
          {
            "name": "Femoral Sentado",
            "sets": 4,
            "reps": "12",
            "rest": "75s",
            "notes": "Controla la vuelta."
          },
          {
            "name": "Femoral de Pie",
            "sets": 3,
            "reps": "12 por pierna",
            "rest": "60s",
            "notes": "No gires la cadera."
          },
          {
            "name": "Patada en Polea",
            "sets": 3,
            "reps": "15 por pierna",
            "rest": "45s",
            "notes": "Contrae glúteo al final."
          },
          {
            "name": "Crunch en Banco",
            "sets": 3,
            "reps": "15",
            "rest": "45s",
            "notes": "Sin jalar cuello."
          }
        ],
        "cooldown": "Respiración y estiramientos de glúteo/femoral."
      }
    ]
  },
  {
    "id": "visual-arms",
    "title": "Imperial Brazos Visual: Bíceps y Tríceps",
    "targetGoal": "Brazos",
    "level": "Principiante",
    "daysPerWeek": 1,
    "description": "Sesión visual corta para brazos, fácil de seguir desde la app.",
    "trainerRationale": "Diseñada para usuarios que quieren trabajo específico de brazos con técnica simple y segura.",
    "days": [
      {
        "day": "Día 1: Brazos",
        "focus": "Bíceps, tríceps y antebrazo",
        "warmup": "Movilidad de codo y hombro + una serie ligera de curl",
        "exercises": [
          {
            "name": "Curl 21",
            "sets": 3,
            "reps": "21",
            "rest": "60s",
            "notes": "Respeta los tres rangos."
          },
          {
            "name": "Predicador",
            "sets": 3,
            "reps": "10-12",
            "rest": "60s",
            "notes": "Controla la bajada."
          },
          {
            "name": "Hammer",
            "sets": 3,
            "reps": "12",
            "rest": "45s",
            "notes": "No balancees."
          },
          {
            "name": "Curl Agarre Prono",
            "sets": 3,
            "reps": "12",
            "rest": "45s",
            "notes": "Antebrazo y braquial."
          },
          {
            "name": "Extensión Tríceps",
            "sets": 4,
            "reps": "12",
            "rest": "45s",
            "notes": "Codos pegados."
          },
          {
            "name": "Copa",
            "sets": 3,
            "reps": "12",
            "rest": "45s",
            "notes": "Rango cómodo."
          }
        ],
        "cooldown": "Estiramiento suave de bíceps, tríceps y antebrazo."
      }
    ]
  },
  {
    "id": "visual-shoulders",
    "title": "Imperial Hombro Visual 3D",
    "targetGoal": "Hombros",
    "level": "Intermedio",
    "daysPerWeek": 1,
    "description": "Rutina visual para hombros con trabajo frontal, lateral y posterior.",
    "trainerRationale": "Equilibra deltoide anterior, lateral y posterior para estética y salud articular.",
    "days": [
      {
        "day": "Día 1: Hombro",
        "focus": "Deltoides completo y trapecio",
        "warmup": "Rotadores externos + movilidad escapular",
        "exercises": [
          {
            "name": "Press Militar",
            "sets": 4,
            "reps": "8-10",
            "rest": "90s",
            "notes": "No hiperextiendas espalda."
          },
          {
            "name": "Elevaciones Laterales",
            "sets": 4,
            "reps": "15",
            "rest": "45s",
            "notes": "Codo ligeramente flexionado."
          },
          {
            "name": "Elevación Frontal",
            "sets": 3,
            "reps": "12",
            "rest": "45s",
            "notes": "Sube hasta altura de ojos."
          },
          {
            "name": "Elevación Lateral en Inclinado",
            "sets": 3,
            "reps": "12",
            "rest": "45s",
            "notes": "Control total."
          },
          {
            "name": "Fly Posterior",
            "sets": 4,
            "reps": "15",
            "rest": "45s",
            "notes": "Apretar escápulas."
          },
          {
            "name": "Jalón a la Cara",
            "sets": 3,
            "reps": "20",
            "rest": "45s",
            "notes": "Salud de hombro."
          }
        ],
        "cooldown": "Estiramiento de deltoides y movilidad torácica."
      }
    ]
  },
  {
    "id": "visual-core-cardio",
    "title": "Imperial Core + Cardio Visual",
    "targetGoal": "Resistencia",
    "level": "Principiante",
    "daysPerWeek": 1,
    "description": "Circuito visual de abdomen y cardio para usar dentro del gimnasio.",
    "trainerRationale": "Aumenta frecuencia de uso de la app porque funciona como guía rápida para sesiones cortas o finalizadores.",
    "days": [
      {
        "day": "Circuito 1",
        "focus": "Core, coordinación y acondicionamiento",
        "warmup": "3 min caminata rápida + movilidad general",
        "exercises": [
          {
            "name": "Escaladora",
            "sets": 4,
            "reps": "30 segundos",
            "rest": "30s",
            "notes": "Cadera estable."
          },
          {
            "name": "Sit Ups",
            "sets": 4,
            "reps": "12-15",
            "rest": "30s",
            "notes": "Controla la bajada."
          },
          {
            "name": "Burpees",
            "sets": 4,
            "reps": "8-12",
            "rest": "45s",
            "notes": "Adapta velocidad al nivel."
          },
          {
            "name": "Skipping",
            "sets": 4,
            "reps": "30 segundos",
            "rest": "30s",
            "notes": "Rodillas activas."
          },
          {
            "name": "Saltos",
            "sets": 4,
            "reps": "20",
            "rest": "30s",
            "notes": "Aterriza suave."
          },
          {
            "name": "Plancha Frontal",
            "sets": 3,
            "reps": "30-45 segundos",
            "rest": "30s",
            "notes": "Abdomen firme."
          }
        ],
        "cooldown": "Caminar 3 min y respiración nasal."
      }
    ]
  },
  {
    "id": "visual-fullbody-beginner",
    "title": "Imperial Full Body Visual Principiante",
    "targetGoal": "Adaptación General",
    "level": "Principiante",
    "daysPerWeek": 3,
    "description": "Plan visual de cuerpo completo para nuevos usuarios del gimnasio.",
    "trainerRationale": "Prioriza adherencia, aprendizaje técnico y seguridad antes de subir carga.",
    "days": [
      {
        "day": "Día 1: Full Body",
        "focus": "Patrones básicos",
        "warmup": "Caminadora 7 min + movilidad articular",
        "exercises": [
          {
            "name": "Sentadilla",
            "sets": 3,
            "reps": "12",
            "rest": "75s",
            "notes": "Técnica limpia."
          },
          {
            "name": "Press Banca",
            "sets": 3,
            "reps": "12",
            "rest": "75s",
            "notes": "Carga ligera."
          },
          {
            "name": "Remo Bajo",
            "sets": 3,
            "reps": "12",
            "rest": "75s",
            "notes": "Espalda activa."
          },
          {
            "name": "Prensa 45°",
            "sets": 3,
            "reps": "12",
            "rest": "75s",
            "notes": "Movimiento controlado."
          },
          {
            "name": "Curl Banco Inclinado",
            "sets": 2,
            "reps": "12",
            "rest": "45s",
            "notes": "Sin balanceo."
          },
          {
            "name": "Extensión Tríceps",
            "sets": 2,
            "reps": "12",
            "rest": "45s",
            "notes": "Codos fijos."
          }
        ],
        "cooldown": "5 min caminata y estiramiento general."
      }
    ]
  }
];
