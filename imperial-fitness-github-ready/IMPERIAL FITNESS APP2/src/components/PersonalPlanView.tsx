import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserCheck, RefreshCw, Sliders, HelpCircle, Utensils, Dumbbell, ChevronDown, ChevronUp, AlertTriangle, CalendarDays, ListChecks, Timer, Target, Search, Plus, Trash2, ArrowUp, ArrowDown, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { ClientProfile, DietPlan, WorkoutRoutine, DietMealItem, FOOD_DATABASE, ROUTINE_TEMPLATES } from '../data/mockData';
import type { FoodItem, RoutineTemplate } from '../data/foodDatabase';
import { limitationSummary, type UserLimitationInput } from '../data/careRules';
import { calculateMacroAwareEquivalence } from '../data/nutritionEquivalence';
import { generateImperialRoutine, TRAINING_DAYS, TrainingGoal, TrainingLevel, TrainingSplit, TrainingIntensityMode, ExerciseSourceFilter, RoutineMuscleTarget, WeeklyTrainingDayPlan, ROUTINE_MUSCLE_TARGETS, IMPERIAL_EQUIPMENT, TRAINING_MODE_PRESETS, TRAINING_INTENSITY_MODE_PRESETS, getTrainingModePreset, exerciseConflictsWithLimitations, isOpenExerciseSource, isHypertrophyGymExercise } from '../data/gymProgramming';
import { EXERCISE_CATALOG, mergeExerciseCatalog, type ExerciseCatalogItem } from '../data/exerciseCatalog';
import { ExerciseImage } from './ExerciseImage';
import { FoodImage } from './FoodImage';
import { ZoomableAvatar } from './ZoomableAvatar';
import { ImperialCarePanel } from './ImperialCarePanel';
import { NutritionSafetyReviewCard } from './NutritionSafetyReviewCard';
import { TrainingVolumeAuditPanel } from './TrainingVolumeAuditPanel';
import { calculateEquivalenceFromApi, createDietPlanInApi, createFoodInApi, deleteDietPlanInApi, getMyDietPlanFromApi, getScienceGuidelinesFromApi, listDietDraftsFromApi, listDietPlansFromApi, listFoodsFromApi, previewNutritionTargetsFromApi, publishDietPlanInApi, updateDietPlanInApi, updateMyDietPlanMealsFromApi, type NutritionTargetApi } from '../services/nutritionService';
import { createAssignedRoutineInApi, createRoutineTemplateInApi, deactivateAssignedRoutineInApi, getClientRoutineDeliveryHealthFromApi, getMyAssignedRoutineFromApi, listAssignedRoutinesFromApi, listRoutineTemplatesFromApi, updateAssignedRoutineInApi } from '../services/routineService';
import { listClientsFromApi } from '../services/userService';
import { listExercisesFromApi } from '../services/exerciseService';
import { loadOpenExerciseDbItems, openExerciseDbSourceLabel, translateOpenExerciseName } from '../services/openExerciseDbService';
import { getFoodImageOverridesFromApi, saveFoodImageOverrideToApi, uploadFoodImageToApi } from '../services/mediaService';
import { normalizeFoodKey, type FoodImageOverrides } from '../data/foodMedia';
import { assessCalorieCompliance, assessNutritionCompliance, validateFoodCaloriesPer100g } from '../utils/nutritionTargets';
import { balanceDietMeals, calculateDietTotals } from '../utils/dietBalancer';
import { createWorkoutSetInApi, listBodyMetricsFromApi, listWorkoutHistoryFromApi, type WorkoutSetApi } from '../services/progressService';
import { buildWarmupExercises, inferRoutineBlock, ROUTINE_BLOCK_OPTIONS } from '../utils/routineBlocks';
import { FIXED_HYPERTROPHY_ROUTINES, type FixedHypertrophyTemplate, type FixedRoutineAudience } from '../data/fixedHypertrophyRoutines';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

type PublishScope = 'all' | 'diet' | 'routine';

interface PersonalPlanViewProps {
  users: ClientProfile[];
  currentUser: ClientProfile;
  selectedClientId?: string;
  onGenerateDiet: (diet: DietPlan) => void;
  onGenerateRoutine: (routine: WorkoutRoutine) => void;
  onRemoveDiet?: (clientId: string) => void;
  onRemoveRoutine?: (clientId: string) => void;
  existingDiets: DietPlan[];
  existingRoutines: WorkoutRoutine[];
}

const DEFAULT_CUSTOM_WEEKLY_PLAN: Record<string, RoutineMuscleTarget[]> = {
  Lunes: ['pecho', 'triceps'],
  Martes: ['espalda', 'biceps'],
  Miércoles: ['pierna', 'gluteo'],
  Jueves: ['hombro', 'abdomen'],
  Viernes: ['gluteo', 'femoral', 'pantorrilla'],
  Sábado: [],
  Domingo: [],
};

export const PersonalPlanView: React.FC<PersonalPlanViewProps> = ({
  users,
  currentUser,
  selectedClientId,
  onGenerateDiet,
  onGenerateRoutine,
  onRemoveDiet,
  onRemoveRoutine,
  existingDiets,
  existingRoutines
}) => {
  const [apiClients, setApiClients] = useState<ClientProfile[]>([]);
  const clientsOnly = useMemo(() => (apiClients.length > 0 ? apiClients : users.filter(u => u.role === 'client')), [apiClients, users]);
  const initialClient = clientsOnly.find(c => c.id === selectedClientId) || 
                        (currentUser.role === 'client' ? currentUser : clientsOnly[0]) || 
                        currentUser;

  const [targetClientId, setTargetClientId] = useState<string>(initialClient.id);
  const activeClientObj = clientsOnly.find(c => c.id === targetClientId) || initialClient;
  const targetClientIdRef = useRef(targetClientId);
  const assignedPlansRequestRef = useRef(0);
  targetClientIdRef.current = targetClientId;

  // Parámetros biométricos sincronizados para el recálculo en tiempo real
  const [weight, setWeight] = useState(activeClientObj.weight || 0);
  const [bodyFat, setBodyFat] = useState(activeClientObj.bodyFat || 0);
  const [muscleMass, setMuscleMass] = useState(activeClientObj.muscleMass || 0);
  const [goal, setGoal] = useState(activeClientObj.goal || '');
  const [nutritionTargetApi, setNutritionTargetApi] = useState<NutritionTargetApi | null>(null);
  const [nutritionTargetError, setNutritionTargetError] = useState('');
  const [nutritionTargetLoading, setNutritionTargetLoading] = useState(false);

  // Estado para las sustituciones: qué ítem estamos cambiando en qué comida
  const [substitutingItem, setSubstitutingItem] = useState<{ mealIndex: number; itemIndex: number; item: DietMealItem } | null>(null);
  const [substitutionMessage, setSubstitutionMessage] = useState('');
  const [substitutionSearch, setSubstitutionSearch] = useState('');
  const [foodFilter, setFoodFilter] = useState<string>('all');
  const [foodSearch, setFoodSearch] = useState('');
  const [apiFoods, setApiFoods] = useState<FoodItem[]>([]);
  const [apiRoutines, setApiRoutines] = useState<RoutineTemplate[]>([]);
  const [apiStatus, setApiStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const [dietVariantIndex, setDietVariantIndex] = useState(0);
  const [selectedMealIndexesForGeneration, setSelectedMealIndexesForGeneration] = useState<Set<number>>(new Set([0, 1, 2, 3]));
  const [selectedRoutineExerciseKeys, setSelectedRoutineExerciseKeys] = useState<Set<string>>(new Set());
  const [routineRegenerationReason, setRoutineRegenerationReason] = useState<'variation' | 'no_gusta' | 'molestia' | 'sin_maquina' | 'muy_dificil' | 'muy_facil'>('variation');
  const [routineRotationIndex, setRoutineRotationIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState('');
  const [publishStatus, setPublishStatus] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null);
  const [expandedRoutineIds, setExpandedRoutineIds] = useState<Set<string>>(new Set());
  const [expandedFixedRoutineIds, setExpandedFixedRoutineIds] = useState<Set<string>>(new Set());
  const [fixedAudienceFilter, setFixedAudienceFilter] = useState<FixedRoutineAudience>(initialClient.gender === 'F' ? 'Mujer' : initialClient.gender === 'M' ? 'Hombre' : 'General');
  const [selectedRoutineDayIndex, setSelectedRoutineDayIndex] = useState(0);
  const [manualExerciseSearch, setManualExerciseSearch] = useState('');
  const [manualExerciseSets, setManualExerciseSets] = useState(3);
  const [manualExerciseReps, setManualExerciseReps] = useState('8-12');
  const [manualExerciseRest, setManualExerciseRest] = useState('60-90s');
  const [manualExercisePosition, setManualExercisePosition] = useState(1);
  const [manualExerciseBlock, setManualExerciseBlock] = useState('Auto');
  const [manualMealName, setManualMealName] = useState('Almuerzo Personalizado');
  const [manualFoodName, setManualFoodName] = useState('Pechuga de pollo a la plancha');
  const [manualGrams, setManualGrams] = useState(150);
  const [manualCategory, setManualCategory] = useState<DietMealItem['category']>('protein');
  const [manualProteinPer100, setManualProteinPer100] = useState(31);
  const [manualCarbsPer100, setManualCarbsPer100] = useState(0);
  const [manualFatPer100, setManualFatPer100] = useState(3.6);
  const [manualCalsPer100, setManualCalsPer100] = useState(165);
  const [trainingGoal, setTrainingGoal] = useState<TrainingGoal>('hipertrofia');
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>('Intermedio');
  const [trainingSplit, setTrainingSplit] = useState<TrainingSplit>('auto');
  const [trainingIntensityMode, setTrainingIntensityMode] = useState<TrainingIntensityMode>('sin_tecnicas');
  const [routineExerciseSource, setRoutineExerciseSource] = useState<ExerciseSourceFilter>('all');
  const [apiExercises, setApiExercises] = useState<ExerciseCatalogItem[]>([]);
  const [openExercises, setOpenExercises] = useState<ExerciseCatalogItem[]>([]);
  const [exerciseCatalogStatus, setExerciseCatalogStatus] = useState('Cargando catálogo visual de ejercicios…');
  const [selectedTrainingDays, setSelectedTrainingDays] = useState<string[]>(['Lunes', 'Miércoles', 'Viernes']);
  const [useCustomWeeklySplit, setUseCustomWeeklySplit] = useState(false);
  const [customWeeklyPlanDraft, setCustomWeeklyPlanDraft] = useState<Record<string, RoutineMuscleTarget[]>>(DEFAULT_CUSTOM_WEEKLY_PLAN);
  const [routineStatus, setRoutineStatus] = useState('');
  const [activeLimitations, setActiveLimitations] = useState<UserLimitationInput[]>([]);
  const [, setLimitationsLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [activeRoutine, setActiveRoutine] = useState<WorkoutRoutine | null>(null);
  const [routineTitleDraft, setRoutineTitleDraft] = useState('');
  const [routineObjectiveDraft, setRoutineObjectiveDraft] = useState('');
  const [routineAdviceDraft, setRoutineAdviceDraft] = useState('');
  const [planNotesDraft, setPlanNotesDraft] = useState('');
  const [foodAdminStatus, setFoodAdminStatus] = useState('');
  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodCategory, setNewFoodCategory] = useState<FoodItem['category']>('protein');
  const [newFoodProtein, setNewFoodProtein] = useState(0);
  const [newFoodCarbs, setNewFoodCarbs] = useState(0);
  const [newFoodFat, setNewFoodFat] = useState(0);
  const [newFoodCalories, setNewFoodCalories] = useState(0);
  const [newFoodFiber, setNewFoodFiber] = useState(0);
  const [foodImageOverrides, setFoodImageOverrides] = useState<FoodImageOverrides>({});
  const [foodImageDrafts, setFoodImageDrafts] = useState<Record<string, string>>({});
  const [foodImageStatus, setFoodImageStatus] = useState('');
  const [templateStatus, setTemplateStatus] = useState('');
  const [scienceNotice, setScienceNotice] = useState('');
  const [workoutLogDrafts, setWorkoutLogDrafts] = useState<Record<string, { weightKg: string; reps: string; setNumber: string; rir: string; notes: string }>>({});
  const [workoutLogStatus, setWorkoutLogStatus] = useState<Record<string, string>>({});
  const [savingWorkoutLogKey, setSavingWorkoutLogKey] = useState('');
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSetApi[]>([]);

  const canEditPlans = currentUser.role !== 'client';

const FOOD_IMAGE_OVERRIDES_STORAGE_KEY = 'imperial_food_image_overrides_v1';

const loadLocalFoodImageOverrides = (): FoodImageOverrides => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(FOOD_IMAGE_OVERRIDES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const persistLocalFoodImageOverrides = (next: FoodImageOverrides) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FOOD_IMAGE_OVERRIDES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // El navegador puede bloquear storage. En ese caso solo queda en memoria.
  }
};

useEffect(() => {
  const localImages = loadLocalFoodImageOverrides();
  if (Object.keys(localImages).length) setFoodImageOverrides(localImages);
  if (!canEditPlans && !currentUser) return;
  getFoodImageOverridesFromApi()
    .then((serverImages) => {
      const merged = { ...localImages, ...serverImages };
      setFoodImageOverrides(merged);
      persistLocalFoodImageOverrides(merged);
    })
    .catch(() => {
      // La app sigue funcionando con las imágenes Imperial locales aunque el backend no responda.
    });
}, [currentUser?.id]);

const updateFoodImageOverrideState = (foodName: string, imageUrl: string) => {
  const key = normalizeFoodKey(foodName);
  const next = { ...foodImageOverrides, [key]: imageUrl };
  setFoodImageOverrides(next);
  setFoodImageDrafts(prev => ({ ...prev, [key]: imageUrl }));
  persistLocalFoodImageOverrides(next);
  return { key, next };
};

const handleSaveFoodImageUrl = async (foodName: string) => {
  const key = normalizeFoodKey(foodName);
  const imageUrl = (foodImageDrafts[key] || foodImageOverrides[key] || '').trim();
  if (!imageUrl) {
    setFoodImageStatus('Pega una URL https, /foods/... o /uploads/... antes de guardar.');
    return;
  }
  updateFoodImageOverrideState(foodName, imageUrl);
  setFoodImageStatus(`Guardando imagen de ${foodName}…`);
  try {
    const savedUrl = await saveFoodImageOverrideToApi(key, imageUrl);
    updateFoodImageOverrideState(foodName, savedUrl);
    setFoodImageStatus(`Imagen de ${foodName} guardada para la app.`);
  } catch {
    setFoodImageStatus(`No se pudo guardar en backend. Quedó aplicada solo en este navegador para previsualizar.`);
  }
};

const handleUploadFoodImage = async (foodName: string, file?: File | null) => {
  if (!file) return;
  const key = normalizeFoodKey(foodName);
  const previewUrl = URL.createObjectURL(file);
  updateFoodImageOverrideState(foodName, previewUrl);
  setFoodImageStatus(`Subiendo imagen de ${foodName}…`);
  try {
    const imageUrl = await uploadFoodImageToApi(key, file);
    updateFoodImageOverrideState(foodName, imageUrl);
    setFoodImageStatus(`Imagen de ${foodName} subida y asociada correctamente.`);
  } catch {
    setFoodImageStatus('No se pudo subir al backend. Puedes pegar una URL https de Cloudinary o una ruta /foods/... y guardar.');
  }
};

  const selectedModePreset = useMemo(() => getTrainingModePreset(trainingSplit), [trainingSplit]);

  useEffect(() => {
    const preset = getTrainingModePreset(trainingSplit);
    if (!preset || !canEditPlans || useCustomWeeklySplit) return;
    setTrainingLevel(preset.recommendedLevel);
    setTrainingGoal(preset.recommendedGoal);
    setSelectedTrainingDays(TRAINING_DAYS.slice(0, preset.days));
    setRoutineStatus(`Modo ${preset.label} aplicado: ${preset.days} días · ${preset.recommendedLevel} · ${preset.purpose}.`);
  }, [trainingSplit, canEditPlans, useCustomWeeklySplit]);

  // Copia local de la dieta activa para permitir sustituciones y recálculos fluidos
  const createEmptyDiet = (client: ClientProfile): DietPlan => ({
    id: `empty-${client.id}`,
    clientId: client.id,
    clientName: client.name,
    baseCalories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    goal: client.goal || 'Plan pendiente de prescripción',
    generatedDate: new Date().toISOString().split('T')[0],
    meals: [],
    hydration: 'Pendiente de asignación por el especialista.',
    supplementation: [],
    specialistDiagnosis: 'Este cliente todavía no tiene una dieta activa asignada.',
  });
  const defaultDiet = existingDiets.find(d => d.clientId === targetClientId) || createEmptyDiet(activeClientObj);
  const [liveDietPlan, setLiveDietPlan] = useState<DietPlan>(JSON.parse(JSON.stringify(defaultDiet)));

  // Copia local de la rutina activa
  const defaultRoutine = activeRoutine || existingRoutines.find(r => r.clientId === targetClientId) || null;

  useEffect(() => {
    const totalDays = defaultRoutine?.days?.length || 0;
    setSelectedRoutineDayIndex(previous => totalDays ? Math.min(previous, totalDays - 1) : 0);
  }, [defaultRoutine?.id, defaultRoutine?.days?.length]);

  const professionalFoods = useMemo(() => {
    // La base incorporada siempre queda disponible. Los registros del servidor
    // reemplazan por nombre a los locales para conservar sus IDs y permitir la
    // validación/persistencia en producción sin dejar el selector vacío.
    const foodsByName = new Map<string, FoodItem>();
    FOOD_DATABASE.forEach((food) => foodsByName.set(food.name.trim().toLowerCase(), food));
    apiFoods.forEach((food) => {
      const key = food.name.trim().toLowerCase();
      foodsByName.set(key, { ...foodsByName.get(key), ...food });
    });
    return Array.from(foodsByName.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [apiFoods]);
  const professionalRoutines = apiRoutines.length > 0 ? apiRoutines : (DEV_MODE ? ROUTINE_TEMPLATES : []);
  const fixedRoutinesForAudience = useMemo(() => FIXED_HYPERTROPHY_ROUTINES.filter((routine) => routine.audience === fixedAudienceFilter), [fixedAudienceFilter]);

  const professionalExercises = useMemo(() => mergeExerciseCatalog([
    ...apiExercises,
    ...EXERCISE_CATALOG,
    ...openExercises,
  ]), [apiExercises, openExercises]);

  const exerciseSourceCounts = useMemo(() => {
    const verified = professionalExercises.filter(isHypertrophyGymExercise);
    const open = verified.filter(isOpenExerciseSource).length;
    return {
      all: verified.length,
      open,
      imperial: verified.length - open,
    };
  }, [professionalExercises]);

  const routineGenerationCatalog = useMemo(() => professionalExercises.filter((item) => {
    if (!item.isActive || item.isRoutineEligible === false || (item.reviewStatus && item.reviewStatus !== 'approved')) return false;
    if (!isHypertrophyGymExercise(item)) return false;
    if (routineExerciseSource === 'open') return isOpenExerciseSource(item);
    if (routineExerciseSource === 'imperial') return !isOpenExerciseSource(item);
    return true;
  }), [professionalExercises, routineExerciseSource]);

  const manualExerciseResults = useMemo(() => {
    const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const query = normalize(manualExerciseSearch);
    if (query.length < 2) return [];
    const isMachineExercise = (item: ExerciseCatalogItem) => /maquina|máquina|polea|cable|smith|prensa|peck|fly|extension|extensión|curl femoral|abductor|aductor/.test(normalize(item.equipment));
    return professionalExercises
      .filter(isHypertrophyGymExercise)
      .filter(item => !exerciseConflictsWithLimitations(item, activeClientObj, activeLimitations))
      .filter(item => normalize(`${item.name} ${item.primaryMuscle} ${item.muscleGroups.join(' ')} ${item.equipment}`).includes(query))
      .sort((a, b) => {
        const sourceDifference = Number(isOpenExerciseSource(b)) - Number(isOpenExerciseSource(a));
        if (sourceDifference) return sourceDifference;
        const machineDifference = Number(isMachineExercise(b)) - Number(isMachineExercise(a));
        if (machineDifference) return machineDifference;
        return a.name.localeCompare(b.name, 'es');
      })
      .slice(0, 12);
  }, [manualExerciseSearch, professionalExercises, activeClientObj, activeLimitations]);

  const routineExerciseSourceLabel = routineExerciseSource === 'open'
    ? 'Base abierta'
    : routineExerciseSource === 'imperial'
    ? 'Imperial Fitness'
    : 'Todas';

  const customWeeklyPlanForGeneration = useMemo<WeeklyTrainingDayPlan[]>(() => {
    if (!useCustomWeeklySplit) return [];
    return TRAINING_DAYS
      .filter(day => selectedTrainingDays.includes(day))
      .map(day => ({ day, muscleTargets: customWeeklyPlanDraft[day] || [] }))
      .filter(item => item.muscleTargets.length > 0);
  }, [customWeeklyPlanDraft, selectedTrainingDays, useCustomWeeklySplit]);

  const customWeeklySummary = customWeeklyPlanForGeneration
    .map(item => `${item.day}: ${item.muscleTargets.map(target => ROUTINE_MUSCLE_TARGETS.find(option => option.id === target)?.shortLabel || target).join(' + ')}`)
    .join(' · ');

  const refreshAssignedPlans = async (showMessage = true) => {
    const requestId = ++assignedPlansRequestRef.current;
    const requestedClientId = currentUser.role === 'client' ? currentUser.id : targetClientId;
    const requestedClient = clientsOnly.find(client => client.id === requestedClientId) || activeClientObj;
    const isCurrentRequest = () => (
      requestId === assignedPlansRequestRef.current
      && targetClientIdRef.current === requestedClientId
    );

    try {
      if (currentUser.role === 'client') {
        const [diet, firstRoutine] = await Promise.all([
          getMyDietPlanFromApi(),
          getMyAssignedRoutineFromApi(),
        ]);
        const routine = firstRoutine || await getMyAssignedRoutineFromApi().catch(() => null);
        if (!isCurrentRequest()) return;

        if (diet) {
          setLiveDietPlan(JSON.parse(JSON.stringify(diet)));
          setPlanNotesDraft(diet.specialistDiagnosis || '');
          onGenerateDiet(diet);
        } else {
          const emptyDiet = createEmptyDiet(requestedClient);
          setLiveDietPlan(emptyDiet);
          setPlanNotesDraft(emptyDiet.specialistDiagnosis || '');
          onRemoveDiet?.(requestedClientId);
        }
        if (routine && routine.clientId === requestedClientId) {
          setActiveRoutine(routine);
          setRoutineTitleDraft(routine.title);
          setRoutineObjectiveDraft(routine.objective);
          setRoutineAdviceDraft(routine.specialistAdvice || '');
          onGenerateRoutine(routine);
        } else {
          setActiveRoutine(null);
          onRemoveRoutine?.(requestedClientId);
        }
        if (showMessage) {
          const routineExercises = routine?.days.reduce((total, day) => total + day.exercises.length, 0) || 0;
          setSaveStatus(diet?.meals.length ? 'Plan del cliente actualizado correctamente.' : diet ? 'El plan activo no contiene comidas.' : 'Todavía no hay dieta asignada.');
          setRoutineStatus(routine && routineExercises > 0 ? 'Rutina del cliente actualizada correctamente.' : routine ? 'La asignación activa existe, pero no contiene días y ejercicios completos.' : 'Todavía no hay rutina asignada.');
        }
        return;
      }

      const [dietsFromApi, dietDraftsFromApi, firstRoutinesFromApi] = await Promise.all([
        listDietPlansFromApi(requestedClientId),
        listDietDraftsFromApi(requestedClientId).catch(() => []),
        listAssignedRoutinesFromApi(requestedClientId),
      ]);
      const confirmedRoutines = firstRoutinesFromApi.length
        ? firstRoutinesFromApi
        : await listAssignedRoutinesFromApi(requestedClientId).catch(() => []);
      if (!isCurrentRequest()) return;

      const activeDiet = dietDraftsFromApi[0] || dietsFromApi.find(plan => plan.clientId === requestedClientId);
      const activeRoutine = confirmedRoutines.find(routine => routine.clientId === requestedClientId);
      if (activeDiet) {
        setLiveDietPlan(JSON.parse(JSON.stringify(activeDiet)));
        setPlanNotesDraft(activeDiet.specialistDiagnosis || '');
        onGenerateDiet(activeDiet);
      } else {
        const emptyDiet = createEmptyDiet(requestedClient);
        setLiveDietPlan(emptyDiet);
        setPlanNotesDraft(emptyDiet.specialistDiagnosis || '');
        onRemoveDiet?.(requestedClientId);
      }
      if (activeRoutine) {
        setActiveRoutine(activeRoutine);
        setRoutineTitleDraft(activeRoutine.title);
        setRoutineObjectiveDraft(activeRoutine.objective);
        setRoutineAdviceDraft(activeRoutine.specialistAdvice || '');
        onGenerateRoutine(activeRoutine);
      } else {
        setActiveRoutine(null);
        onRemoveRoutine?.(requestedClientId);
      }
      if (showMessage) {
        const routineExercises = activeRoutine?.days.reduce((total, day) => total + day.exercises.length, 0) || 0;
        setSaveStatus(activeDiet?.meals.length ? 'Dieta actualizada correctamente.' : activeDiet ? 'La dieta activa no contiene comidas.' : 'Este cliente todavía no tiene dieta asignada.');
        setRoutineStatus(activeRoutine && routineExercises > 0 ? 'Rutina actualizada correctamente.' : activeRoutine ? 'La fila activa existe, pero la rutina no contiene días y ejercicios completos.' : 'Este cliente todavía no tiene rutina asignada.');
      }
    } catch {
      if (!isCurrentRequest()) return;
      if (showMessage) {
        setSaveStatus('No se pudo actualizar la información. Verifica tu conexión o sesión.');
        setRoutineStatus('No se pudo actualizar la información.');
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadApiData() {
      try {
        const [foods, routines, exercisesResult, openResult] = await Promise.all([
          listFoodsFromApi().catch(() => []),
          listRoutineTemplatesFromApi().catch(() => []),
          listExercisesFromApi(currentUser.role !== 'client').catch(() => []),
          loadOpenExerciseDbItems().catch(() => []),
        ]);
        if (!cancelled) {
          setApiFoods(foods);
          setApiRoutines(routines);
          setApiExercises(exercisesResult);
          setOpenExercises(openResult);
          setExerciseCatalogStatus(openResult.length
            ? `${openResult.length} ejercicios cargados desde ${openExerciseDbSourceLabel()} con nombres en español.`
            : 'Base abierta no disponible; generador usando catálogo Imperial Fitness.');
          setApiStatus(foods.length || routines.length || exercisesResult.length ? 'connected' : 'offline');
        }
      } catch {
        if (!cancelled) {
          setApiStatus('offline');
          setExerciseCatalogStatus('Modo revisión: no se pudo cargar la base abierta. Generador usando catálogo local Imperial Fitness.');
        }
      }
    }

    loadApiData();
    listClientsFromApi().then(setApiClients).catch(() => undefined);
    getScienceGuidelinesFromApi().then((guidelines) => setScienceNotice(guidelines.safety_notice)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (currentUser.role === 'client' || !selectedClientId) return;
    if (clientsOnly.some(client => client.id === selectedClientId)) {
      setTargetClientId(selectedClientId);
    }
  }, [selectedClientId, currentUser.role, clientsOnly]);

  useEffect(() => {
    setFixedAudienceFilter(activeClientObj.gender === 'F' ? 'Mujer' : activeClientObj.gender === 'M' ? 'Hombre' : 'General');
    setExpandedFixedRoutineIds(new Set());
  }, [targetClientId]);

  useEffect(() => {
    void refreshAssignedPlans(false);
  }, [targetClientId, currentUser.id, currentUser.role]);

  // Al cambiar de cliente limpiamos solo la vista temporal. La fuente definitiva
  // de dieta y rutina es el servidor; esto evita que una copia local antigua o
  // vacía reemplace una asignación que acaba de cargar la API.
  useEffect(() => {
    setPublishStatus('');
    setLastPublishedAt(null);
    setLimitationsLoadState('loading');
    setActiveLimitations([]);
    const found = clientsOnly.find(c => c.id === targetClientId) || activeClientObj;
    setWeight(found.weight || 0);
    setBodyFat(found.bodyFat || 0);
    setMuscleMass(found.muscleMass || 0);
    setGoal(found.goal || '');

    const cachedDiet = existingDiets.find(d => d.clientId === targetClientId);
    const cachedRoutine = existingRoutines.find(r => r.clientId === targetClientId) || null;
    const nextDiet = cachedDiet || createEmptyDiet(found);
    setLiveDietPlan(JSON.parse(JSON.stringify(nextDiet)));
    setPlanNotesDraft(nextDiet.specialistDiagnosis || '');
    setActiveRoutine(cachedRoutine);
    setRoutineTitleDraft(cachedRoutine?.title || '');
    setRoutineObjectiveDraft(cachedRoutine?.objective || '');
    setRoutineAdviceDraft(cachedRoutine?.specialistAdvice || '');
    setSelectedMealIndexesForGeneration(new Set([0, 1, 2, 3]));
  }, [targetClientId]);

  // La aplicación global puede recibir una asignación nueva mientras el cliente
  // mantiene abierta esta pantalla. Solo adoptamos copias reales; nunca borramos
  // el plan por una lista local vacía durante una carga o reconexión.
  useEffect(() => {
    const matchingDiet = existingDiets.find(d => d.clientId === targetClientId);
    if (matchingDiet && JSON.stringify(matchingDiet) !== JSON.stringify(liveDietPlan)) {
      setLiveDietPlan(JSON.parse(JSON.stringify(matchingDiet)));
      setPlanNotesDraft(matchingDiet.specialistDiagnosis || '');
    }
    const matchingRoutine = existingRoutines.find(r => r.clientId === targetClientId);
    if (matchingRoutine && JSON.stringify(matchingRoutine) !== JSON.stringify(activeRoutine)) {
      setActiveRoutine(matchingRoutine);
      setRoutineTitleDraft(matchingRoutine.title);
      setRoutineObjectiveDraft(matchingRoutine.objective);
      setRoutineAdviceDraft(matchingRoutine.specialistAdvice || '');
    }
  }, [targetClientId, existingDiets, existingRoutines]);

  // Si los datos del perfil llegan después del listado inicial, actualizamos la
  // biometría sin tocar las asignaciones ya cargadas.
  useEffect(() => {
    setWeight(activeClientObj.weight || 0);
    setBodyFat(activeClientObj.bodyFat || 0);
    setMuscleMass(activeClientObj.muscleMass || 0);
    setGoal(activeClientObj.goal || '');
  }, [activeClientObj.id, activeClientObj.weight, activeClientObj.bodyFat, activeClientObj.muscleMass, activeClientObj.goal]);

  useEffect(() => {
    let cancelled = false;
    listBodyMetricsFromApi(targetClientId)
      .then((metrics) => {
        if (cancelled) return;
        const latestMetric = metrics[metrics.length - 1];
        if (!latestMetric) return;
        setWeight(latestMetric.weight);
        setBodyFat(latestMetric.body_fat);
        setMuscleMass(latestMetric.muscle_mass);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [targetClientId, existingDiets]);

  useEffect(() => {
    let cancelled = false;
    listWorkoutHistoryFromApi(targetClientId)
      .then((history) => {
        if (!cancelled) {
          setWorkoutHistory([...history].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
      })
      .catch(() => {
        if (!cancelled) setWorkoutHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [targetClientId]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setNutritionTargetLoading(true);
      setNutritionTargetError('');
      previewNutritionTargetsFromApi(targetClientId, goal)
        .then((targets) => {
          if (!cancelled) setNutritionTargetApi(targets);
        })
        .catch((error) => {
          if (cancelled) return;
          setNutritionTargetApi(null);
          setNutritionTargetError(error instanceof Error ? error.message : 'Completa los datos corporales y de actividad antes de calcular calorías.');
        })
        .finally(() => {
          if (!cancelled) setNutritionTargetLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [targetClientId, goal, activeClientObj.height, activeClientObj.age, activeClientObj.gender, activeClientObj.activityLevel, activeClientObj.workoutsPerWeek, activeClientObj.averageDailySteps, existingDiets]);

  // --- OBJETIVOS NUTRICIONALES: calculados únicamente por el backend con datos reales ---
  const nutritionTargets = {
    bmr: nutritionTargetApi?.bmr || 0,
    bmrSource: nutritionTargetApi?.bmr_source || 'pending',
    maintenanceCalories: nutritionTargetApi?.maintenance_calories || 0,
    targetCalories: nutritionTargetApi?.target_calories || 0,
    proteinGrams: nutritionTargetApi?.protein_grams || 0,
    carbsGrams: nutritionTargetApi?.carbs_grams || 0,
    fatGrams: nutritionTargetApi?.fat_grams || 0,
    goalType: nutritionTargetApi?.goal_type || 'pending',
    goalLabel: nutritionTargetApi?.goal_label || 'Datos incompletos',
    adjustmentPercent: nutritionTargetApi?.adjustment_percent || 0,
    rationale: nutritionTargetApi
      ? `Motor ${nutritionTargetApi.formula_version}; TMB ${nutritionTargetApi.bmr_source === 'inbody' ? 'tomada de InBody' : nutritionTargetApi.bmr_source === 'recorded_bmr' ? 'registrada, pendiente de confirmar su fuente' : 'estimada con Mifflin-St Jeor'} y actividad ${nutritionTargetApi.activity_level}.`
      : nutritionTargetError || 'Completa peso, estatura, edad, sexo, actividad y objetivo.',
  };
  const isDeficit = nutritionTargets.goalType === 'fat_loss';
  const fatMassKg = Math.round(weight * Math.max(bodyFat, 0) / 100 * 10) / 10;
  const leanMassKg = Math.round(Math.max(0, weight - fatMassKg) * 10) / 10;
  const mifflinBmr = nutritionTargets.bmr;
  const maintenanceCalories = nutritionTargets.maintenanceCalories;
  const calculatedBaseCalories = nutritionTargets.targetCalories;
  const liveProtein = nutritionTargets.proteinGrams;
  const liveFat = nutritionTargets.fatGrams;
  const liveCarbs = nutritionTargets.carbsGrams;

  const foodByName = (keywords: string[], fallback: { name: string; protein?: number; carbs: number; fat?: number; cals: number; category: DietMealItem['category'] }) => {
    const found = professionalFoods.find(food => keywords.some(keyword => food.name.toLowerCase().includes(keyword.toLowerCase())));
    if (!found) {
      return {
        name: fallback.name,
        proteinPer100g: fallback.protein || 0,
        carbsPer100g: fallback.carbs,
        fatPer100g: fallback.fat || 0,
        calsPer100g: fallback.cals,
        category: fallback.category,
      };
    }
    const category: DietMealItem['category'] = found.category === 'protein' || found.category === 'dairy'
      ? 'protein'
      : found.category === 'fat' || found.category === 'snack'
      ? 'fat'
      : found.category === 'veg'
      ? 'veg'
      : 'carb';
    return { name: found.name, proteinPer100g: found.proteinPer100g, carbsPer100g: found.carbsPer100g, fatPer100g: found.fatPer100g, calsPer100g: found.calsPer100g, category };
  };

  const gramsForMacro = (food: ReturnType<typeof foodByName>, macro: 'protein' | 'carb' | 'fat', targetGrams: number, min = 20, max = 450) => {
    const per100 = macro === 'protein' ? food.proteinPer100g : macro === 'carb' ? food.carbsPer100g : food.fatPer100g;
    if (!per100 || per100 <= 0) return min;
    const raw = (targetGrams * 100) / per100;
    return Math.max(min, Math.min(max, Math.round(raw)));
  };

  const item = (id: string, food: ReturnType<typeof foodByName>, grams: number): DietMealItem => ({
    id,
    originalName: food.name,
    currentName: food.name,
    amountGrams: Math.max(10, Math.round(grams)),
    baseCarbsPer100g: food.carbsPer100g,
    baseCalsPer100g: food.calsPer100g,
    baseProteinPer100g: food.proteinPer100g,
    baseFatPer100g: food.fatPer100g,
    category: food.category,
  });

  const itemMacros = (dietItem: DietMealItem) => ({
    protein: Math.round((dietItem.amountGrams * (dietItem.baseProteinPer100g || 0)) / 100),
    carbs: Math.round((dietItem.amountGrams * (dietItem.baseCarbsPer100g || 0)) / 100),
    fat: Math.round((dietItem.amountGrams * (dietItem.baseFatPer100g || 0)) / 100),
    cals: Math.round((dietItem.amountGrams * (dietItem.baseCalsPer100g || 0)) / 100),
  });

  const mealMacros = (meal: DietPlan['meals'][number]) => meal.items.reduce((acc, dietItem) => {
    const macros = itemMacros(dietItem);
    return {
      protein: acc.protein + macros.protein,
      carbs: acc.carbs + macros.carbs,
      fat: acc.fat + macros.fat,
      cals: acc.cals + macros.cals,
    };
  }, { protein: 0, carbs: 0, fat: 0, cals: 0 });

  const planMacros = (plan: DietPlan) => {
    const totals = calculateDietTotals(plan.meals);
    return {
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      cals: totals.calories,
    };
  };

  const rebalanceMealsToCalorieTarget = (
    meals: DietPlan['meals'],
    protectedPosition: { mealIndex: number; itemIndex: number },
    targetCalories: number,
  ) => {
    const clonedMeals = JSON.parse(JSON.stringify(meals)) as DietPlan['meals'];
    const rawItemCalories = (dietItem: DietMealItem) => Math.max(0, (dietItem.amountGrams * (dietItem.baseCalsPer100g || 0)) / 100);
    const rawTotal = () => clonedMeals.reduce((total, meal) => total + meal.items.reduce((mealTotal, dietItem) => mealTotal + rawItemCalories(dietItem), 0), 0);
    const scaleItems = (includeProtected: boolean, ratio: number) => {
      clonedMeals.forEach((meal, mealIndex) => {
        meal.items.forEach((dietItem, itemIndex) => {
          if (!includeProtected && mealIndex === protectedPosition.mealIndex && itemIndex === protectedPosition.itemIndex) return;
          if (rawItemCalories(dietItem) <= 0) return;
          dietItem.amountGrams = Math.max(1, Math.round(dietItem.amountGrams * ratio * 10) / 10);
        });
      });
    };

    const beforeCalories = rawTotal();
    if (!targetCalories || beforeCalories <= targetCalories) {
      return { meals: clonedMeals, adjusted: false, calories: Math.round(beforeCalories) };
    }

    const protectedItem = clonedMeals[protectedPosition.mealIndex]?.items[protectedPosition.itemIndex];
    const protectedCalories = protectedItem ? rawItemCalories(protectedItem) : 0;
    const otherCalories = Math.max(0, beforeCalories - protectedCalories);
    if (otherCalories > 0 && protectedCalories < targetCalories) {
      const otherRatio = Math.min(1, Math.max(0.02, ((targetCalories * 0.995) - protectedCalories) / otherCalories));
      scaleItems(false, otherRatio);
    }

    let balancedCalories = rawTotal();
    if (balancedCalories > targetCalories) {
      const allRatio = Math.min(1, Math.max(0.02, (targetCalories * 0.99) / balancedCalories));
      scaleItems(true, allRatio);
      balancedCalories = rawTotal();
    }

    return { meals: clonedMeals, adjusted: true, calories: Math.round(balancedCalories) };
  };

  const currentPlanMacros = planMacros(liveDietPlan);
  const calorieCompliance = assessCalorieCompliance(currentPlanMacros.cals, calculatedBaseCalories);
  const publishedPlanCompliance = assessCalorieCompliance(currentPlanMacros.cals, liveDietPlan.baseCalories || 1);
  const nutritionCompliance = assessNutritionCompliance(
    currentPlanMacros,
    { cals: calculatedBaseCalories, protein: liveProtein, carbs: liveCarbs, fat: liveFat },
  );
  const hasPublishableDiet = liveDietPlan.meals.some(meal => meal.items.length > 0);
  const dietReadyForPublication = hasPublishableDiet && liveDietPlan.meals.filter(meal => meal.items.length > 0).length >= 3 && nutritionCompliance.isCompliant;
  const hasPublishableRoutine = Boolean(defaultRoutine?.days.some(day => day.exercises.length > 0));
  const publicationTimestamps = [lastPublishedAt, liveDietPlan.publishedAt, defaultRoutine?.publishedAt]
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const latestPublicationAt = publicationTimestamps[0] || null;
  const formatPublicationDate = (value?: string | null) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const foodCategoryUi = (category: FoodItem['category'] | DietMealItem['category']) => ({
    protein: { label: 'Proteína', className: 'border-red-900/50 bg-red-950/20 text-red-100' },
    carb: { label: 'Carbohidrato', className: 'border-amber-900/50 bg-amber-950/20 text-amber-100' },
    fat: { label: 'Grasa', className: 'border-lime-900/50 bg-lime-950/20 text-lime-100' },
    veg: { label: 'Verdura', className: 'border-emerald-900/50 bg-emerald-950/20 text-emerald-100' },
    drink: { label: 'Bebida', className: 'border-sky-900/50 bg-sky-950/20 text-sky-100' },
    fruit: { label: 'Fruta', className: 'border-fuchsia-900/50 bg-fuchsia-950/20 text-fuchsia-100' },
    dairy: { label: 'Lácteo', className: 'border-blue-900/50 bg-blue-950/20 text-blue-100' },
    snack: { label: 'Plato / snack', className: 'border-neutral-700 bg-neutral-900 text-neutral-100' },
  }[category as FoodItem['category']] || { label: 'Alimento', className: 'border-neutral-700 bg-neutral-900 text-neutral-100' });


  const compatibleFoodCategory = (foodCategory: FoodItem['category'], itemCategory: DietMealItem['category']) => {
    if (foodCategory === itemCategory) return true;
    if (itemCategory === 'protein' && foodCategory === 'dairy') return true;
    if (itemCategory === 'carb' && (foodCategory === 'fruit' || foodCategory === 'snack')) return true;
    if (itemCategory === 'fat' && foodCategory === 'snack') return true;
    return false;
  };

  const compactFoodAdvice = (food: FoodItem) => {
    if (food.category === 'veg') return 'Úsalo para aumentar volumen del plato con pocas calorías.';
    if (food.category === 'protein' || food.category === 'dairy') return 'Buena opción para completar proteína del día.';
    if (food.category === 'carb' || food.category === 'fruit') return 'Energía útil si se mide la porción.';
    if (food.category === 'fat') return 'Saludable, pero siempre medido.';
    if (food.category === 'drink') return 'Preferir sin azúcar añadida.';
    return 'Opción práctica si está dentro de tus porciones.';
  };

  const macroChipsForFood = (food: Pick<FoodItem, 'proteinPer100g' | 'carbsPer100g' | 'fatPer100g' | 'calsPer100g' | 'fiberPer100g'>) => [
    { label: 'P', value: `${food.proteinPer100g}g` },
    { label: 'C', value: `${food.carbsPer100g}g` },
    { label: 'G', value: `${food.fatPer100g}g` },
    { label: 'Fibra', value: `${food.fiberPer100g}g` },
  ];

  type MacroTotals = { protein: number; carbs: number; fat: number; cals: number };
  type DietMeal = DietPlan['meals'][number];
  type RoutineExercise = WorkoutRoutine['days'][number]['exercises'][number];

  const clampNumber = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));

  const macroDeviationSummary = (totals: MacroTotals) => {
    const caloriesDelta = totals.cals - calculatedBaseCalories;
    const proteinDelta = totals.protein - liveProtein;
    const carbsDelta = totals.carbs - liveCarbs;
    const fatDelta = totals.fat - liveFat;
    const format = (value: number, suffix = 'g') => `${value > 0 ? '+' : ''}${value}${suffix}`;
    return `Balance final aproximado: ${totals.cals} kcal (${format(caloriesDelta, ' kcal')}), proteína ${totals.protein}g (${format(proteinDelta)}), carbohidratos ${totals.carbs}g (${format(carbsDelta)}), grasas ${totals.fat}g (${format(fatDelta)}).`;
  };

  const scaleMealToTargets = (meal: DietMeal, target: MacroTotals): DietMeal => {
    const current = mealMacros(meal);
    const proteinRatio = current.protein > 0 ? target.protein / current.protein : 1;
    const carbRatio = current.carbs > 0 ? target.carbs / current.carbs : 1;
    const fatRatio = current.fat > 0 ? target.fat / current.fat : 1;

    const scaledItems = meal.items.map((dietItem) => {
      let ratio = 1;
      let min = 10;
      let max = 450;
      if (dietItem.category === 'protein') {
        ratio = proteinRatio;
        min = 60;
        max = 380;
      } else if (dietItem.category === 'carb') {
        ratio = carbRatio;
        min = 25;
        max = 450;
      } else if (dietItem.category === 'fat') {
        ratio = fatRatio;
        min = 5;
        max = 120;
      } else if (dietItem.category === 'veg') {
        ratio = 1;
        min = 80;
        max = 260;
      } else {
        ratio = current.cals > 0 ? target.cals / current.cals : 1;
        min = 10;
        max = 350;
      }
      return { ...dietItem, amountGrams: clampNumber(dietItem.amountGrams * ratio, min, max) };
    });
    return { ...meal, items: scaledItems };
  };

  const normalizeMealsToCalorieTarget = (meals: DietMeal[], targetCalories: number): DietMeal[] => {
    const normalized = JSON.parse(JSON.stringify(meals)) as DietMeal[];
    if (!targetCalories || normalized.length === 0) return normalized;

    const rawCalories = (dietItem: DietMealItem) => Math.max(0, (dietItem.amountGrams * (dietItem.baseCalsPer100g || 0)) / 100);
    const totalCalories = () => normalized.reduce((total, meal) => total + meal.items.reduce((sum, dietItem) => sum + rawCalories(dietItem), 0), 0);
    const boundsFor = (dietItem: DietMealItem): [number, number] => {
      if (dietItem.category === 'fat') return [3, 120];
      if (dietItem.category === 'protein') return [20, 450];
      if (dietItem.category === 'carb' || dietItem.category === 'fruit') return [15, 500];
      if (dietItem.category === 'veg') return [60, 350];
      return [5, 500];
    };

    for (let pass = 0; pass < 4; pass += 1) {
      const current = totalCalories();
      if (current <= 0 || Math.abs(current - targetCalories) / targetCalories <= 0.01) break;
      const ratio = Math.max(0.72, Math.min(1.38, targetCalories / current));
      normalized.forEach(meal => meal.items.forEach(dietItem => {
        if (rawCalories(dietItem) <= 0) return;
        const [minimum, maximum] = boundsFor(dietItem);
        const moderatedRatio = dietItem.category === 'veg' ? 1 + ((ratio - 1) * 0.25) : ratio;
        dietItem.amountGrams = Math.round(Math.max(minimum, Math.min(maximum, dietItem.amountGrams * moderatedRatio)) * 10) / 10;
      }));
    }
    return normalized;
  };

  const mergeMealsPreservingMacroTargets = (generatedBase: DietPlan, selectedIndexes: Set<number>, hasExistingMeals: boolean) => {
    if (!hasExistingMeals) return { meals: generatedBase.meals, note: macroDeviationSummary(planMacros(generatedBase)) };

    const totalMeals = Math.max(liveDietPlan.meals.length, generatedBase.meals.length);
    const selected = Array.from({ length: totalMeals }, (_, index) => index).filter(index => selectedIndexes.has(index));
    const preserved = Array.from({ length: totalMeals }, (_, index) => index).filter(index => !selectedIndexes.has(index) && liveDietPlan.meals[index]);

    const preservedTotals = preserved.reduce<MacroTotals>((acc, index) => {
      const macros = mealMacros(liveDietPlan.meals[index]);
      return { protein: acc.protein + macros.protein, carbs: acc.carbs + macros.carbs, fat: acc.fat + macros.fat, cals: acc.cals + macros.cals };
    }, { protein: 0, carbs: 0, fat: 0, cals: 0 });

    const remainingTarget: MacroTotals = {
      protein: Math.max(20, liveProtein - preservedTotals.protein),
      carbs: Math.max(25, liveCarbs - preservedTotals.carbs),
      fat: Math.max(8, liveFat - preservedTotals.fat),
      cals: Math.max(250, calculatedBaseCalories - preservedTotals.cals),
    };

    const generatedSelectedTotals = selected.reduce<MacroTotals>((acc, index) => {
      const meal = generatedBase.meals[index];
      if (!meal) return acc;
      const macros = mealMacros(meal);
      return { protein: acc.protein + macros.protein, carbs: acc.carbs + macros.carbs, fat: acc.fat + macros.fat, cals: acc.cals + macros.cals };
    }, { protein: 0, carbs: 0, fat: 0, cals: 0 });

    const meals = Array.from({ length: totalMeals }, (_, index) => {
      if (!selectedIndexes.has(index)) return liveDietPlan.meals[index] || generatedBase.meals[index];
      const generatedMeal = generatedBase.meals[index] || liveDietPlan.meals[index];
      if (!generatedMeal) return undefined;
      const generatedMacros = mealMacros(generatedMeal);
      const target: MacroTotals = {
        protein: Math.max(8, Math.round(remainingTarget.protein * (generatedSelectedTotals.protein ? generatedMacros.protein / generatedSelectedTotals.protein : 1 / Math.max(selected.length, 1)))),
        carbs: Math.max(10, Math.round(remainingTarget.carbs * (generatedSelectedTotals.carbs ? generatedMacros.carbs / generatedSelectedTotals.carbs : 1 / Math.max(selected.length, 1)))),
        fat: Math.max(3, Math.round(remainingTarget.fat * (generatedSelectedTotals.fat ? generatedMacros.fat / generatedSelectedTotals.fat : 1 / Math.max(selected.length, 1)))),
        cals: Math.max(120, Math.round(remainingTarget.cals * (generatedSelectedTotals.cals ? generatedMacros.cals / generatedSelectedTotals.cals : 1 / Math.max(selected.length, 1)))),
      };
      return scaleMealToTargets(generatedMeal, target);
    }).filter((meal): meal is DietMeal => Boolean(meal));

    return { meals, note: macroDeviationSummary(planMacros({ ...generatedBase, meals })) };
  };

  const normalizeText = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const catalogForExercise = (exercise: RoutineExercise): ExerciseCatalogItem | undefined => {
    if (exercise.exerciseId) {
      const byId = professionalExercises.find(item => item.id === exercise.exerciseId);
      if (byId) return byId;
    }
    const exName = normalizeText(exercise.name || '');
    const translatedName = normalizeText(translateOpenExerciseName(exercise.name || '', exercise.equipment || ''));
    return professionalExercises.find(item => normalizeText(item.name) === exName)
      || professionalExercises.find(item => translatedName && normalizeText(item.name) === translatedName)
      || professionalExercises.find(item => exName && normalizeText(item.name).includes(exName))
      || professionalExercises.find(item => translatedName && normalizeText(item.name).includes(translatedName));
  };

  const looksLikeEnglishExerciseName = (value: string) => /\b(barbell|dumbbell|cable|machine|smith|squat|deadlift|curl|press|row|raise|pulldown|pull[- ]?up|push[- ]?up|lunge|extension|fly|crunch|plank|seated|standing|incline|decline|lying|reverse|wide[- ]?grip|close[- ]?grip)\b/i.test(value);

  const displayRoutineExerciseName = (exercise: RoutineExercise, meta?: ExerciseCatalogItem) => {
    if (meta?.name) return meta.name;
    const rawName = exercise.name || 'Ejercicio pendiente';
    return looksLikeEnglishExerciseName(rawName) ? translateOpenExerciseName(rawName, exercise.equipment || '') : rawName;
  };

  const sourceLabelForExercise = (meta?: ExerciseCatalogItem) => {
    if (!meta) return 'Imperial Fitness';
    return isOpenExerciseSource(meta) ? 'Base abierta' : 'Imperial Fitness';
  };

  const exerciseHasProgressSignal = (exercise: RoutineExercise) => Boolean(exercise.exerciseId || /progreso|carga|historial|rir|intensidad/i.test(exercise.notes || ''));

  const routineExerciseKey = (dayIndex: number, exerciseIndex: number) => `${dayIndex}-${exerciseIndex}`;

  const toggleRoutineExerciseForGeneration = (dayIndex: number, exerciseIndex: number) => {
    const key = routineExerciseKey(dayIndex, exerciseIndex);
    setSelectedRoutineExerciseKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllRoutineExercisesForGeneration = () => {
    if (!defaultRoutine) return;
    const keys = new Set<string>();
    defaultRoutine.days.forEach((day, dayIndex) => {
      day.exercises.forEach((_, exerciseIndex) => keys.add(routineExerciseKey(dayIndex, exerciseIndex)));
    });
    setSelectedRoutineExerciseKeys(keys);
  };

  const clearRoutineExercisesForGeneration = () => setSelectedRoutineExerciseKeys(new Set());

  const persistManualRoutineChange = async (updatedRoutine: WorkoutRoutine, successMessage: string) => {
    const draftRoutine = { ...updatedRoutine, publishedAt: undefined, publishedBy: undefined };
    setActiveRoutine(draftRoutine);
    onGenerateRoutine(draftRoutine);
    setRoutineStatus('Guardando el ajuste como versión pendiente de envío final…');
    try {
      const saved = /^\d+$/.test(defaultRoutine?.id || '')
        ? await updateAssignedRoutineInApi(defaultRoutine!.id, draftRoutine)
        : await createAssignedRoutineInApi(draftRoutine);
      setActiveRoutine(saved);
      onGenerateRoutine(saved);
      setRoutineTitleDraft(saved.title);
      setRoutineObjectiveDraft(saved.objective);
      setRoutineAdviceDraft(saved.specialistAdvice || '');
      setRoutineStatus(`${successMessage} Pulsa Guardar y enviar rutina para confirmar la versión al cliente.`);
    } catch {
      setRoutineStatus('El cambio quedó visible como borrador, pero no pudo guardarse en el servidor. Revisa la sesión o conexión.');
    }
  };

  const handleAddExerciseManually = async (catalogItem: ExerciseCatalogItem) => {
    if (!canEditPlans || !defaultRoutine) return;
    if (defaultRoutine.structureLocked) {
      setRoutineStatus('Esta es una plantilla fija. Desbloquea la estructura antes de agregar ejercicios.');
      return;
    }
    if (exerciseConflictsWithLimitations(catalogItem, activeClientObj, activeLimitations)) {
      setRoutineStatus(`No se agregó ${catalogItem.name}: entra en conflicto con una limitación activa del cliente.`);
      return;
    }
    const selectedDay = defaultRoutine.days[selectedRoutineDayIndex];
    if (!selectedDay) return;
    const alreadyExists = selectedDay.exercises.some(ex => ex.exerciseId === catalogItem.id || normalizeText(ex.name) === normalizeText(catalogItem.name));
    if (alreadyExists) {
      setRoutineStatus(`${catalogItem.name} ya está incluido en ${selectedDay.day}.`);
      return;
    }
    const manualExercise: RoutineExercise = {
      exerciseId: catalogItem.id,
      name: catalogItem.name,
      sets: Math.max(1, Math.min(10, Math.round(manualExerciseSets || 3))),
      reps: manualExerciseReps.trim() || '8-12',
      rest: manualExerciseRest.trim() || '60-90s',
      equipment: catalogItem.equipment,
      segment: catalogItem.segment,
      block: manualExerciseBlock === 'Auto' ? inferRoutineBlock(catalogItem) : manualExerciseBlock,
      imageUrl: catalogItem.imageUrl,
      muscleGroups: catalogItem.muscleGroups,
      notes: `Agregado manualmente por ${currentUser.name}. ${catalogItem.coachingNotes || ''}`.trim(),
    };
    const insertionIndex = Math.max(0, Math.min(selectedDay.exercises.length, Math.round(manualExercisePosition || 1) - 1));
    const nextExercises = [...selectedDay.exercises];
    nextExercises.splice(insertionIndex, 0, manualExercise);
    const updatedRoutine: WorkoutRoutine = {
      ...defaultRoutine,
      days: defaultRoutine.days.map((day, dayIndex) => dayIndex === selectedRoutineDayIndex
        ? { ...day, exercises: nextExercises }
        : day),
      title: routineTitleDraft.trim() || defaultRoutine.title,
      objective: routineObjectiveDraft.trim() || defaultRoutine.objective,
      specialistAdvice: routineAdviceDraft || defaultRoutine.specialistAdvice,
      autoGenerated: false,
      safetyReviewRequired: false,
      safetySummary: limitationSummary(activeLimitations),
    };
    setManualExerciseSearch('');
    setManualExercisePosition(Math.min(nextExercises.length + 1, insertionIndex + 2));
    await persistManualRoutineChange(updatedRoutine, `${catalogItem.name} fue agregado en la posición ${insertionIndex + 1} de ${selectedDay.day}.`);
  };

  const handleMoveRoutineExercise = async (dayIndex: number, exerciseIndex: number, direction: -1 | 1) => {
    if (!canEditPlans || !defaultRoutine) return;
    if (defaultRoutine.structureLocked) {
      setRoutineStatus('Esta es una plantilla fija. Desbloquea la estructura antes de cambiar el orden de ejercicios.');
      return;
    }
    const selectedDay = defaultRoutine.days[dayIndex];
    if (!selectedDay) return;
    const targetIndex = exerciseIndex + direction;
    if (targetIndex < 0 || targetIndex >= selectedDay.exercises.length) return;
    const nextExercises = [...selectedDay.exercises];
    [nextExercises[exerciseIndex], nextExercises[targetIndex]] = [nextExercises[targetIndex], nextExercises[exerciseIndex]];
    const moved = nextExercises[targetIndex];
    const updatedRoutine: WorkoutRoutine = {
      ...defaultRoutine,
      days: defaultRoutine.days.map((day, index) => index === dayIndex ? { ...day, exercises: nextExercises } : day),
      title: routineTitleDraft.trim() || defaultRoutine.title,
      objective: routineObjectiveDraft.trim() || defaultRoutine.objective,
      specialistAdvice: routineAdviceDraft || defaultRoutine.specialistAdvice,
      autoGenerated: false,
    };
    await persistManualRoutineChange(updatedRoutine, `${moved.name} quedó en la posición ${targetIndex + 1} de ${selectedDay.day}.`);
  };

  const handleUpdateRoutineExercisePrescription = async (dayIndex: number, exerciseIndex: number, form: HTMLFormElement) => {
    if (!canEditPlans || !defaultRoutine) return;
    const selectedDay = defaultRoutine.days[dayIndex];
    const exercise = selectedDay?.exercises[exerciseIndex];
    if (!selectedDay || !exercise) return;

    const formData = new FormData(form);
    const nextSets = Number(formData.get('sets'));
    const nextReps = String(formData.get('reps') || '').trim();
    const nextRest = String(formData.get('rest') || '').trim();
    const prescribedLoad = String(formData.get('prescribedLoad') || '').trim();
    const targetRir = String(formData.get('targetRir') || '').trim();
    const notes = String(formData.get('notes') || '').trim();

    if (!Number.isFinite(nextSets) || nextSets < 1 || nextSets > 10 || !nextReps) {
      setRoutineStatus('No se guardó el ajuste: usa entre 1 y 10 series e indica un rango de repeticiones.');
      return;
    }

    const updatedRoutine: WorkoutRoutine = {
      ...defaultRoutine,
      days: defaultRoutine.days.map((day, index) => index === dayIndex
        ? {
          ...day,
          exercises: day.exercises.map((item, itemIndex) => itemIndex === exerciseIndex
            ? {
              ...item,
              sets: Math.round(nextSets),
              reps: nextReps,
              rest: nextRest || item.rest || '60-90s',
              prescribedLoad: prescribedLoad || undefined,
              targetRir: targetRir || undefined,
              notes: notes || undefined,
            }
            : item),
        }
        : day),
      autoGenerated: false,
    };

    await persistManualRoutineChange(updatedRoutine, `Se actualizó la prescripción de ${exercise.name} sin modificar la estructura fija.`);
  };

  const handleChangeRoutineExerciseBlock = async (dayIndex: number, exerciseIndex: number, block: string) => {
    if (!canEditPlans || !defaultRoutine) return;
    const selectedDay = defaultRoutine.days[dayIndex];
    const exercise = selectedDay?.exercises[exerciseIndex];
    if (!selectedDay || !exercise) return;
    const updatedRoutine: WorkoutRoutine = {
      ...defaultRoutine,
      days: defaultRoutine.days.map((day, index) => index === dayIndex
        ? { ...day, exercises: day.exercises.map((item, itemIndex) => itemIndex === exerciseIndex ? { ...item, block } : item) }
        : day),
      autoGenerated: false,
    };
    await persistManualRoutineChange(updatedRoutine, `${exercise.name} quedó dentro del módulo ${block}.`);
  };

  const handleRemoveRoutineExercise = async (dayIndex: number, exerciseIndex: number) => {
    if (!canEditPlans || !defaultRoutine) return;
    if (defaultRoutine.structureLocked) {
      setRoutineStatus('Esta es una plantilla fija. Desbloquea la estructura antes de retirar ejercicios.');
      return;
    }
    const selectedDay = defaultRoutine.days[dayIndex];
    const removed = selectedDay?.exercises[exerciseIndex];
    if (!selectedDay || !removed) return;
    const updatedRoutine: WorkoutRoutine = {
      ...defaultRoutine,
      days: defaultRoutine.days.map((day, index) => index === dayIndex
        ? { ...day, exercises: day.exercises.filter((_, indexToKeep) => indexToKeep !== exerciseIndex) }
        : day),
      autoGenerated: false,
      safetyReviewRequired: false,
      safetySummary: limitationSummary(activeLimitations),
    };
    setSelectedRoutineExerciseKeys(new Set());
    await persistManualRoutineChange(updatedRoutine, `${removed.name} fue retirado de ${selectedDay.day}.`);
  };


  const scoreReplacementCandidate = (candidate: ExerciseCatalogItem, original: RoutineExercise, originalMeta: ExerciseCatalogItem | undefined, usedNames: Set<string>) => {
    let score = 0;
    const candidateName = normalizeText(candidate.name);
    if (usedNames.has(candidateName)) score -= 90;
    if (originalMeta) {
      if (candidate.segment === originalMeta.segment) score += 30;
      if (candidate.movement === originalMeta.movement) score += 28;
      if (normalizeText(candidate.primaryMuscle) === normalizeText(originalMeta.primaryMuscle)) score += 32;
      const overlap = candidate.muscleGroups.filter(group => originalMeta.muscleGroups.map(normalizeText).includes(normalizeText(group))).length;
      score += overlap * 8;
      if (candidate.equipment !== originalMeta.equipment && routineRegenerationReason === 'sin_maquina') score += 18;
    } else {
      const text = normalizeText(`${original.name} ${original.notes || ''}`);
      if (candidate.muscleGroups.some(group => text.includes(normalizeText(group)))) score += 16;
      if (candidate.segment === original.segment) score += 10;
    }
    if (routineRegenerationReason === 'muy_dificil' && ['todos', 'principiante'].includes(candidate.level)) score += 18;
    if (routineRegenerationReason === 'muy_facil' && ['intermedio', 'avanzado'].includes(candidate.level)) score += 14;
    if (isOpenExerciseSource(candidate)) score += 24;
    if (/maquina|máquina|polea|cable|smith|prensa|peck|fly|extension|extensión|curl femoral|abductor|aductor/.test(normalizeText(candidate.equipment))) score += 18;
    if (candidate.imageUrl && !candidate.needsImageReview) score += 4;
    return score;
  };

  const buildReplacementExercise = (original: RoutineExercise, usedNames: Set<string>, rotationKey: number): RoutineExercise => {
    const originalMeta = catalogForExercise(original);
    const originalName = normalizeText(original.name || '');
    const pool = routineGenerationCatalog
      .filter(item => item.isActive)
      .filter(item => normalizeText(item.name) !== originalName && item.id !== original.exerciseId)
      .filter(item => trainingLevel !== 'Principiante' || item.level !== 'avanzado')
      .filter(item => trainingGoal !== 'salud' || !item.needsImageReview)
      .filter(item => !exerciseConflictsWithLimitations(item, activeClientObj, activeLimitations))
      .filter(item => {
        if (!originalMeta) return true;
        const sameSegment = item.segment === originalMeta.segment;
        const sameMovement = item.movement === originalMeta.movement;
        const samePrimary = normalizeText(item.primaryMuscle) === normalizeText(originalMeta.primaryMuscle);
        const sharedMuscle = item.muscleGroups.some(group => originalMeta.muscleGroups.map(normalizeText).includes(normalizeText(group)));
        return sameSegment && (sameMovement || samePrimary || sharedMuscle);
      });

    const ordered = pool
      .map(item => ({ item, score: scoreReplacementCandidate(item, original, originalMeta, usedNames) }))
      .filter(row => row.score > 0)
      .sort((a, b) => b.score - a.score);

    const sameScoreGroup = ordered.filter(row => row.score === ordered[0]?.score);
    const pickSource = sameScoreGroup.length > 1 ? sameScoreGroup : ordered;
    const picked = pickSource[Math.abs(rotationKey) % Math.max(pickSource.length, 1)]?.item;

    if (!picked) {
      return {
        ...original,
        notes: `${original.notes || ''} Requiere revisión manual: no se encontró un reemplazo seguro equivalente con la selección actual.`.trim(),
      };
    }

    usedNames.add(normalizeText(picked.name));
    const reasonLabel = {
      variation: 'variación controlada',
      no_gusta: 'preferencia del cliente',
      molestia: 'molestia reportada',
      sin_maquina: 'equipo no disponible',
      muy_dificil: 'ajuste de dificultad',
      muy_facil: 'mayor estímulo requerido',
    }[routineRegenerationReason];

    return {
      ...original,
      exerciseId: picked.id,
      name: picked.name,
      equipment: picked.equipment,
      segment: picked.segment,
      imageUrl: picked.imageUrl,
      muscleGroups: picked.muscleGroups,
      intensityTechnique: undefined,
      notes: `Cambio por ${reasonLabel}. Se conservan series, repeticiones y descansos para proteger la progresión. La técnica de intensidad queda desactivada en este reemplazo para evitar una carga mal aplicada; si deseas técnicas nuevas, regenera la rutina completa con el modo correspondiente. Nuevo grupo muscular: ${picked.muscleGroups.join(', ')}. Equipo: ${picked.equipment}. ${picked.coachingNotes || ''}`.trim(),
    };
  };

  const handleRegenerateSelectedRoutineExercises = async () => {
    if (!canEditPlans || !defaultRoutine) return;
    if (defaultRoutine.structureLocked) {
      setRoutineStatus('La plantilla fija no permite reemplazos automáticos. Desbloquea la estructura solo si realmente necesitas cambiar ejercicios.');
      return;
    }
    if (selectedRoutineExerciseKeys.size === 0) {
      setRoutineStatus('Selecciona al menos un ejercicio para cambiar. Los no seleccionados se conservan igual.');
      return;
    }
    const highSeverity = activeLimitations.filter(item => (item.status || 'active') === 'active' && item.severity === 'alta');
    if (highSeverity.length > 0) {
      setRoutineStatus('Cambio automático bloqueado: existe una limitación de severidad alta. Revisa el caso manualmente.');
      return;
    }

    const nextRotation = routineRotationIndex + 1;
    setRoutineRotationIndex(nextRotation);
    const usedNames = new Set<string>();
    defaultRoutine.days.forEach(day => day.exercises.forEach(ex => usedNames.add(normalizeText(ex.name || ''))));

    const changedLabels: string[] = [];
    const updatedDays = defaultRoutine.days.map((day, dayIndex) => ({
      ...day,
      exercises: day.exercises.map((exercise, exerciseIndex) => {
        const key = routineExerciseKey(dayIndex, exerciseIndex);
        if (!selectedRoutineExerciseKeys.has(key)) return exercise;
        const updated = buildReplacementExercise(exercise, usedNames, nextRotation + dayIndex + exerciseIndex);
        changedLabels.push(`${day.day}: ${exercise.name} → ${updated.name}`);
        return updated;
      }),
    }));

    const updatedRoutine: WorkoutRoutine = {
      ...defaultRoutine,
      days: updatedDays,
      title: routineTitleDraft.trim() || defaultRoutine.title,
      objective: routineObjectiveDraft.trim() || defaultRoutine.objective,
      specialistAdvice: `${routineAdviceDraft || defaultRoutine.specialistAdvice} Ajuste selectivo aplicado: se cambiaron solo los ejercicios seleccionados, respetando grupo muscular, patrón de movimiento, nivel, fuente seleccionada, equipo disponible y limitaciones activas.`,
      autoGenerated: true,
      safetyReviewRequired: false,
      safetySummary: limitationSummary(activeLimitations),
      publishedAt: undefined,
      publishedBy: undefined,
    };

    setActiveRoutine(updatedRoutine);
    onGenerateRoutine(updatedRoutine);
    setRoutineStatus('Cambiando únicamente los ejercicios seleccionados y conservando lo que ya funcionaba…');
    try {
      const saved = await updateAssignedRoutineInApi(defaultRoutine.id, updatedRoutine);
      setActiveRoutine(saved);
      onGenerateRoutine(saved);
      setRoutineTitleDraft(saved.title);
      setRoutineObjectiveDraft(saved.objective);
      setRoutineAdviceDraft(saved.specialistAdvice || '');
      setSelectedRoutineExerciseKeys(new Set());
      setRoutineStatus(`Rutina actualizada: ${changedLabels.slice(0, 3).join(' · ')}${changedLabels.length > 3 ? ` · +${changedLabels.length - 3} cambios` : ''}. Pulsa Guardar y enviar rutina para confirmar esta versión al cliente.`);
    } catch {
      setRoutineStatus('Los cambios quedaron visibles como borrador, pero no se confirmó el guardado. Revisa tu sesión o conexión antes de continuar.');
    }
  };

  const defaultMealLabels = ['Desayuno', 'Almuerzo', 'Snack', 'Cena'];

  const getMealDisplayLabel = (index: number, meal?: DietPlan['meals'][number]) => {
    const normalizedName = (meal?.name || '').toLowerCase();
    if (normalizedName.includes('desayuno')) return 'Desayuno';
    if (normalizedName.includes('almuerzo')) return 'Almuerzo';
    if (normalizedName.includes('cena')) return 'Cena';
    if (normalizedName.includes('snack') || normalizedName.includes('pre') || normalizedName.includes('post')) return 'Snack';
    return defaultMealLabels[index] || `Comida ${index + 1}`;
  };

  const toggleMealForGeneration = (index: number) => {
    setSelectedMealIndexesForGeneration((previous) => {
      const next = new Set(previous);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAllMealsForGeneration = () => {
    const count = Math.max(liveDietPlan.meals.length, 4);
    setSelectedMealIndexesForGeneration(new Set(Array.from({ length: count }, (_, index) => index)));
  };

  const clearMealsForGeneration = () => setSelectedMealIndexesForGeneration(new Set());

  const buildAutomaticDiet = (variantSeed = dietVariantIndex): DietPlan => {
    const variant = Math.abs(variantSeed) % 4;
    const variantLabel = ['Clásica Imperial', 'Digestiva Ligera', 'Colombiana Práctica', 'Alto Rendimiento'][variant];

    const desayunoProteinaPrincipal = variant === 1
      ? foodByName(['yogur griego', 'queso cottage'], { name: 'Yogur griego natural sin azúcar', protein: 10, carbs: 4, fat: 0.7, cals: 59, category: 'protein' })
      : variant === 2
      ? foodByName(['huevos enteros', 'huevo'], { name: 'Huevos enteros cocidos', protein: 13, carbs: 1, fat: 11, cals: 155, category: 'protein' })
      : foodByName(['claras'], { name: 'Claras de huevo', protein: 11, carbs: 1, fat: 0.2, cals: 52, category: 'protein' });
    const desayunoProteinaSecundaria = variant === 0
      ? foodByName(['huevos enteros', 'huevo'], { name: 'Huevos enteros cocidos', protein: 13, carbs: 1, fat: 11, cals: 155, category: 'protein' })
      : foodByName(['proteína de suero', 'whey', 'pavo'], { name: 'Proteína de suero (Whey) polvo', protein: 80, carbs: 7, fat: 3, cals: 376, category: 'protein' });
    const desayunoCarbo = variant === 2
      ? foodByName(['arepa', 'pan integral'], { name: 'Arepa de maíz blanco', protein: 4, carbs: 45, fat: 3.5, cals: 210, category: 'carb' })
      : foodByName(['avena'], { name: 'Avena en hojuelas', protein: 13, carbs: 66, fat: 7, cals: 389, category: 'carb' });
    const desayunoFruta = variant === 3
      ? foodByName(['banano'], { name: 'Banano', protein: 1, carbs: 23, fat: 0.3, cals: 89, category: 'carb' })
      : foodByName(['fresas', 'arándanos'], { name: 'Fresas', protein: 1, carbs: 8, fat: 0, cals: 32, category: 'carb' });

    const almuerzoProteina = variant === 1
      ? foodByName(['pavo', 'lomo de cerdo'], { name: 'Pavo molido magro', protein: 24, carbs: 0, fat: 7, cals: 163, category: 'protein' })
      : variant === 2
      ? foodByName(['lomo de res', 'carne molida'], { name: 'Lomo de res magro', protein: 26, carbs: 0, fat: 8, cals: 180, category: 'protein' })
      : foodByName(['pechuga de pollo', 'pollo'], { name: 'Pechuga de pollo a la plancha', protein: 31, carbs: 0, fat: 3.6, cals: 165, category: 'protein' });
    const almuerzoCarbo = variant === 1
      ? foodByName(['quinoa', 'camote'], { name: 'Quinoa cocida', protein: 4.4, carbs: 21, fat: 1.9, cals: 120, category: 'carb' })
      : variant === 2
      ? foodByName(['arroz blanco', 'arroz integral'], { name: 'Arroz blanco cocido', protein: 2.7, carbs: 28, fat: 0.3, cals: 130, category: 'carb' })
      : isDeficit
      ? foodByName(['papa cocida', 'papa criolla'], { name: 'Papa cocida', protein: 1.7, carbs: 17, fat: 0.1, cals: 77, category: 'carb' })
      : foodByName(['arroz integral', 'arroz blanco'], { name: 'Arroz integral cocido', protein: 2.6, carbs: 23, fat: 0.9, cals: 112, category: 'carb' });
    const almuerzoVeg = variant === 3
      ? foodByName(['espinaca', 'zucchini'], { name: 'Espinaca cruda', protein: 2.9, carbs: 3.6, fat: 0.4, cals: 23, category: 'veg' })
      : foodByName(['brócoli', 'brocoli'], { name: 'Brócoli al vapor', protein: 2.4, carbs: 4, fat: 0.4, cals: 35, category: 'veg' });
    const grasaPrincipal = variant === 1
      ? foodByName(['chía', 'linaza'], { name: 'Semillas de chía', protein: 17, carbs: 42, fat: 31, cals: 486, category: 'fat' })
      : foodByName(['aguacate'], { name: 'Aguacate Hass', protein: 2, carbs: 8, fat: 15, cals: 160, category: 'fat' });

    const snackProteina = variant === 2
      ? foodByName(['atún en agua', 'pavo'], { name: 'Atún en agua', protein: 26, carbs: 0, fat: 1, cals: 116, category: 'protein' })
      : foodByName(['yogur griego', 'proteína de suero', 'whey'], { name: 'Yogur griego natural sin azúcar', protein: 10, carbs: 4, fat: 0.4, cals: 59, category: 'protein' });
    const snackCarbo = variant === 0
      ? (isDeficit ? desayunoFruta : desayunoCarbo)
      : variant === 1
      ? foodByName(['papaya', 'manzana'], { name: 'Papaya', protein: 0.5, carbs: 11, fat: 0.3, cals: 43, category: 'carb' })
      : variant === 2
      ? foodByName(['pan integral', 'arepa'], { name: 'Pan integral', protein: 13, carbs: 43, fat: 3.4, cals: 247, category: 'carb' })
      : foodByName(['banano', 'mandarina'], { name: 'Banano', protein: 1, carbs: 23, fat: 0.3, cals: 89, category: 'carb' });

    const cenaProteina = variant === 2
      ? foodByName(['pollo', 'pavo'], { name: 'Pechuga de pollo a la plancha', protein: 31, carbs: 0, fat: 3.6, cals: 165, category: 'protein' })
      : variant === 3
      ? foodByName(['salmón', 'trucha'], { name: 'Trucha arcoíris', protein: 22, carbs: 0, fat: 6, cals: 148, category: 'protein' })
      : foodByName(['tilapia', 'corvina'], { name: 'Tilapia al vapor', protein: 26, carbs: 0, fat: 2.3, cals: 128, category: 'protein' });
    const cenaCarbo = variant === 1
      ? foodByName(['camote', 'batata'], { name: 'Camote / Batata asada', protein: 1.6, carbs: 20, fat: 0.1, cals: 90, category: 'carb' })
      : variant === 2
      ? foodByName(['plátano verde', 'papa criolla'], { name: 'Plátano verde cocido', protein: 1, carbs: 31, fat: 0.2, cals: 116, category: 'carb' })
      : foodByName(['papa cocida', 'papa criolla'], { name: 'Papa cocida', protein: 1.7, carbs: 17, fat: 0.1, cals: 77, category: 'carb' });
    const cenaVeg = variant === 3
      ? foodByName(['zucchini', 'champiñones'], { name: 'Zucchini / Calabacín salteado', protein: 1.2, carbs: 3.1, fat: 0.3, cals: 17, category: 'veg' })
      : almuerzoVeg;
    const aceite = foodByName(['aceite de oliva'], { name: 'Aceite de oliva', protein: 0, carbs: 0, fat: 100, cals: 884, category: 'fat' });

    const mealTargets = [
      { name: variant === 2 ? 'Desayuno Colombiano Medido' : 'Desayuno de Control Metabólico', protein: liveProtein * 0.25, carbs: liveCarbs * 0.25, fat: liveFat * 0.18 },
      { name: variant === 3 ? 'Almuerzo de Alto Rendimiento' : 'Almuerzo de Rendimiento', protein: liveProtein * 0.35, carbs: liveCarbs * 0.38, fat: liveFat * 0.34 },
      { name: variant === 1 ? 'Snack Digestivo de Adherencia' : 'Snack Pre / Post Entreno', protein: liveProtein * 0.15, carbs: liveCarbs * 0.16, fat: liveFat * 0.08 },
      { name: variant === 3 ? 'Cena de Recuperación Muscular' : 'Cena de Recuperación', protein: liveProtein * 0.25, carbs: liveCarbs * 0.21, fat: liveFat * 0.40 },
    ];

    return {
      id: `auto-${targetClientId}-${Date.now()}`,
      clientId: targetClientId,
      clientName: activeClientObj.name,
      baseCalories: calculatedBaseCalories,
      protein: liveProtein,
      carbs: liveCarbs,
      fat: liveFat,
      goal,
      generatedDate: new Date().toISOString().split('T')[0],
      meals: [
        {
          name: mealTargets[0].name,
          items: [
            item('auto-1', desayunoProteinaPrincipal, gramsForMacro(desayunoProteinaPrincipal, 'protein', mealTargets[0].protein * 0.72, 90, 360)),
            item('auto-2', desayunoProteinaSecundaria, gramsForMacro(desayunoProteinaSecundaria, 'protein', mealTargets[0].protein * 0.28, 25, 160)),
            item('auto-3', desayunoCarbo, gramsForMacro(desayunoCarbo, 'carb', mealTargets[0].carbs * 0.82, 20, 140)),
            item('auto-4', desayunoFruta, gramsForMacro(desayunoFruta, 'carb', mealTargets[0].carbs * 0.18, 60, 240)),
          ],
        },
        {
          name: mealTargets[1].name,
          items: [
            item('auto-5', almuerzoProteina, gramsForMacro(almuerzoProteina, 'protein', mealTargets[1].protein, 110, 290)),
            item('auto-6', almuerzoCarbo, gramsForMacro(almuerzoCarbo, 'carb', mealTargets[1].carbs, 80, 420)),
            item('auto-7', almuerzoVeg, 150),
            item('auto-8', grasaPrincipal, gramsForMacro(grasaPrincipal, 'fat', mealTargets[1].fat * 0.75, 8, 120)),
          ],
        },
        {
          name: mealTargets[2].name,
          items: [
            item('auto-9', snackProteina, gramsForMacro(snackProteina, 'protein', mealTargets[2].protein, 30, 320)),
            item('auto-10', snackCarbo, gramsForMacro(snackCarbo, 'carb', mealTargets[2].carbs, 30, 260)),
          ],
        },
        {
          name: mealTargets[3].name,
          items: [
            item('auto-11', cenaProteina, gramsForMacro(cenaProteina, 'protein', mealTargets[3].protein, 110, 310)),
            item('auto-12', cenaCarbo, gramsForMacro(cenaCarbo, 'carb', mealTargets[3].carbs, 70, 340)),
            item('auto-13', cenaVeg, 170),
            item('auto-14', aceite, gramsForMacro(aceite, 'fat', mealTargets[3].fat * 0.45, 5, 25)),
          ],
        },
      ],
      hydration: `Consumir ${Math.max(2.5, Math.round(weight * 0.045 * 10) / 10)} litros de agua al día. Ajustar si hay calor, sudoración alta o indicación médica.`,
      supplementation: ['Creatina monohidratada 5g/día si el entrenador la aprueba', 'Omega 3 si la alimentación semanal es baja en pescado'],
      specialistDiagnosis: `Plan automático ${variantLabel} para ${activeClientObj.name}: TMB ${mifflinBmr} kcal (${nutritionTargets.bmrSource === 'inbody' ? 'InBody' : nutritionTargets.bmrSource === 'recorded_bmr' ? 'registro pendiente de confirmar' : 'Mifflin-St Jeor'}), mantenimiento estimado ${maintenanceCalories} kcal y objetivo ${calculatedBaseCalories} kcal. Datos reales usados: peso ${weight} kg${bodyFat > 0 ? `, grasa corporal ${bodyFat}% (${fatMassKg} kg) y masa libre de grasa ${leanMassKg} kg` : ''}${muscleMass > 0 ? `, masa muscular ${muscleMass} kg` : ''}. Macros diarios: ${liveProtein}g proteína, ${liveCarbs}g carbohidratos y ${liveFat}g grasas. Las porciones fueron calculadas por gramos reales y el menú fue normalizado al objetivo energético.`,
    };
  };

  const handleGenerateAutomaticDiet = async () => {
    if (!canEditPlans) return;
    if (!nutritionTargetApi || calculatedBaseCalories <= 0) {
      setSaveStatus(nutritionTargetError || 'No se generó la dieta: completa los datos reales del cliente y vuelve a calcular.');
      return;
    }

    const hasExistingMeals = liveDietPlan.meals.length > 0;
    const selectedIndexes = hasExistingMeals
      ? selectedMealIndexesForGeneration
      : new Set([0, 1, 2, 3]);

    if (hasExistingMeals && selectedIndexes.size === 0) {
      setSaveStatus('Selecciona al menos una comida para generar una nueva opción. Las comidas desmarcadas se conservarán igual.');
      return;
    }

    const nextVariant = dietVariantIndex + 1;
    setDietVariantIndex(nextVariant);
    const generatedBase = buildAutomaticDiet(nextVariant);
    const totalMeals = Math.max(liveDietPlan.meals.length, generatedBase.meals.length);
    const macroAwareMerge = mergeMealsPreservingMacroTargets(generatedBase, selectedIndexes, hasExistingMeals);
    const isPartialGeneration = hasExistingMeals && selectedIndexes.size < totalMeals;
    const calorieNormalizedMeals = isPartialGeneration
      ? macroAwareMerge.meals
      : normalizeMealsToCalorieTarget(macroAwareMerge.meals, calculatedBaseCalories);
    const lockedMealIndexes = isPartialGeneration
      ? new Set(Array.from({ length: totalMeals }, (_, index) => index).filter(index => !selectedIndexes.has(index)))
      : new Set<number>();
    const balancedGeneration = balanceDietMeals(
      calorieNormalizedMeals,
      {
        calories: calculatedBaseCalories,
        protein: liveProtein,
        carbs: liveCarbs,
        fat: liveFat,
      },
      36,
      lockedMealIndexes,
    );
    const mergedMeals = balancedGeneration.meals;
    const normalizedNote = `${macroDeviationSummary(planMacros({ ...generatedBase, meals: mergedMeals }))}${balancedGeneration.changedItems > 0 ? ` Ajuste automático final: ${balancedGeneration.changedItems} porciones equilibradas en ${balancedGeneration.iterations} pasadas.` : ''}`;

    const selectedLabels = Array.from(selectedIndexes)
      .sort((a, b) => a - b)
      .map((index) => getMealDisplayLabel(index, liveDietPlan.meals[index] || generatedBase.meals[index]))
      .join(', ');
    const finalPlan: DietPlan = {
      ...generatedBase,
      id: hasExistingMeals ? liveDietPlan.id : generatedBase.id,
      clientId: targetClientId,
      clientName: activeClientObj.name,
      meals: mergedMeals,
      specialistDiagnosis: isPartialGeneration
        ? `${generatedBase.specialistDiagnosis} Ajuste parcial aplicado: se regeneró ${selectedLabels}; las demás comidas se conservaron según la selección del profesional. ${normalizedNote}`
        : `${generatedBase.specialistDiagnosis} ${normalizedNote}`,
      status: 'draft',
      calculation: nutritionTargetApi,
      basedOnMetricId: nutritionTargetApi.based_on_metric_id || undefined,
    };

    setLiveDietPlan(finalPlan);
    onGenerateDiet(finalPlan);

    const usingBuiltInFoodBase = apiStatus !== 'connected' || apiFoods.length === 0;
    setSaveStatus(isPartialGeneration
      ? `Regenerando solo: ${selectedLabels}. Las comidas no seleccionadas se conservan…`
      : usingBuiltInFoodBase
      ? 'Generando una nueva dieta con la base nutricional incorporada y guardando el plan…'
      : 'Generando una nueva dieta y guardando el plan…'
    );

    try {
      const hasEditableDraft = /^\d+$/.test(liveDietPlan.id) && liveDietPlan.status === 'draft';
      const saved = hasEditableDraft
        ? await updateDietPlanInApi(liveDietPlan.id, finalPlan)
        : await createDietPlanInApi(finalPlan, 'draft');
      const normalizedSaved = { ...saved, clientName: finalPlan.clientName };
      setLiveDietPlan(JSON.parse(JSON.stringify(normalizedSaved)));
      setPlanNotesDraft(normalizedSaved.specialistDiagnosis || '');
      onGenerateDiet(normalizedSaved);
      setSaveStatus(!balancedGeneration.compliant
        ? `Dieta guardada como borrador, pero aún requiere ajuste: ${balancedGeneration.issues.join(' · ')}`
        : isPartialGeneration
        ? `Listo: se regeneró ${selectedLabels}, se conservaron las comidas no seleccionadas y el balance nutricional quedó dentro de los rangos.`
        : usingBuiltInFoodBase
        ? 'Dieta generada y equilibrada con la base incorporada. Ya cumple calorías y macronutrientes; revisa y pulsa Guardar y enviar alimentación.'
        : 'Dieta generada, equilibrada y guardada. Ya cumple calorías y macronutrientes; revisa y pulsa Guardar y enviar alimentación.'
      );
    } catch {
      setSaveStatus('La dieta quedó como borrador visible, pero no se confirmó el guardado. Revisa la sesión o conexión antes de continuar.');
    }
  };

  // La dieta automática ahora calcula gramos exactos desde macros objetivo.
  // Evitamos reescalar porciones existentes para no distorsionar los gramos prescritos por alimento.

  const workoutLogKey = (dayIndex: number, exerciseIndex: number) => `${dayIndex}-${exerciseIndex}`;

  const updateWorkoutLogDraft = (key: string, field: 'weightKg' | 'reps' | 'setNumber' | 'rir' | 'notes', value: string) => {
    setWorkoutLogDrafts((previous) => ({
      ...previous,
      [key]: {
        weightKg: previous[key]?.weightKg || '',
        reps: previous[key]?.reps || '',
        setNumber: previous[key]?.setNumber || '1',
        rir: previous[key]?.rir || '',
        notes: previous[key]?.notes || '',
        [field]: value,
      },
    }));
  };

  const saveWorkoutExerciseLog = async (key: string, exerciseName: string) => {
    const draft = workoutLogDrafts[key] || { weightKg: '', reps: '', setNumber: '1', rir: '', notes: '' };
    const weightKg = Number(draft.weightKg);
    const reps = Number(draft.reps);
    const setNumber = Number(draft.setNumber || 1);
    const rir = draft.rir === '' ? undefined : Number(draft.rir);
    if (!Number.isFinite(weightKg) || weightKg < 0 || !Number.isFinite(reps) || reps < 1) {
      setWorkoutLogStatus((previous) => ({ ...previous, [key]: 'Ingresa el peso utilizado y las repeticiones realizadas.' }));
      return;
    }
    setSavingWorkoutLogKey(key);
    setWorkoutLogStatus((previous) => ({ ...previous, [key]: '' }));
    try {
      const saved = await createWorkoutSetInApi({
        userId: targetClientId,
        exerciseName,
        weightKg,
        reps,
        setNumber: Number.isFinite(setNumber) ? Math.max(1, setNumber) : 1,
        rir: rir !== undefined && Number.isFinite(rir) ? rir : undefined,
        notes: draft.notes,
      });
      setWorkoutLogStatus((previous) => ({ ...previous, [key]: `Registro guardado. ${saved.suggestion}` }));
      setWorkoutHistory((previous) => [saved, ...previous.filter((entry) => entry.id !== saved.id)]);
      setWorkoutLogDrafts((previous) => ({ ...previous, [key]: { ...draft, reps: '', setNumber: String(setNumber + 1), notes: '' } }));
    } catch {
      setWorkoutLogStatus((previous) => ({ ...previous, [key]: 'No se pudo guardar el registro. Revisa la conexión e intenta nuevamente.' }));
    } finally {
      setSavingWorkoutLogKey('');
    }
  };

  // --- LÓGICA DE SUSTITUCIÓN INTELIGENTE DE ALIMENTOS ---
  const substitutionCategoryLabel = (category: DietMealItem['category']) => ({
    protein: 'proteínas',
    carb: 'carbohidratos',
    fat: 'grasas',
    veg: 'vegetales',
    drink: 'bebidas',
    fruit: 'frutas',
    dairy: 'lácteos',
    snack: 'snacks',
  }[category]);

  const substitutionCalorieAllowance = (item: DietMealItem) => {
    const originalCalories = Math.max(1, itemMacros(item).cals);
    const caloriesWithoutOriginal = Math.max(0, currentPlanMacros.cals - originalCalories);
    // La sustitución nunca queda bloqueada porque el menú ya esté en el límite.
    // Primero calcula una equivalencia útil y, al confirmar, ajusta otras porciones
    // para que el total diario permanezca dentro del objetivo energético.
    return Math.max(originalCalories, calculatedBaseCalories - caloriesWithoutOriginal, 1);
  };

  const getSubstitutionOptions = (item: DietMealItem) => {
    const calorieAllowance = substitutionCalorieAllowance(item);
    return professionalFoods.filter((food) => {
      // El intercambio respeta el grupo dominante, permitiendo lácteos como proteína
      // y frutas/platos simples como carbohidratos cuando corresponda.
      if (!compatibleFoodCategory(food.category, item.category)) return false;
      if (food.name.trim().toLowerCase() === item.currentName.trim().toLowerCase()) return false;
      const term = normalizeText(substitutionSearch.trim());
      return !term || normalizeText(food.name).includes(term);
    }).sort((a, b) => {
      const aPreview = calculateMacroAwareEquivalence(item, a, { maxSubstituteCalories: calorieAllowance });
      const bPreview = calculateMacroAwareEquivalence(item, b, { maxSubstituteCalories: calorieAllowance });
      const aGoalConflict = a.avoidIfGoalIncludes?.some((word) => goal.toLowerCase().includes(word)) ? 1 : 0;
      const bGoalConflict = b.avoidIfGoalIncludes?.some((word) => goal.toLowerCase().includes(word)) ? 1 : 0;
      if (aGoalConflict !== bGoalConflict) return aGoalConflict - bGoalConflict;
      if (aPreview.calorieCapApplied !== bPreview.calorieCapApplied) return Number(aPreview.calorieCapApplied) - Number(bPreview.calorieCapApplied);
      return bPreview.accuracyPercent - aPreview.accuracyPercent;
    });
  };

  const handlePerformSubstitution = async (substituteFood: FoodItem) => {
    if (!substitutingItem) return;

    const { mealIndex, itemIndex, item } = substitutingItem;
    const calorieAllowance = substitutionCalorieAllowance(item);
    let equivalence = calculateMacroAwareEquivalence(item, substituteFood, { maxSubstituteCalories: calorieAllowance });
    let validatedByServer = false;

    const originalFromApi = professionalFoods.find(
      food => food.name.toLowerCase() === item.currentName.toLowerCase() && food.id,
    );
    if (originalFromApi?.id && substituteFood.id) {
      try {
        const apiResult = await calculateEquivalenceFromApi(originalFromApi.id, substituteFood.id, item.amountGrams, calorieAllowance);
        equivalence = {
          grams: apiResult.substitute_grams,
          original: apiResult.original_macros,
          substitute: apiResult.substitute_macros,
          deltas: apiResult.deltas,
          accuracyPercent: apiResult.accuracy_percent,
          compatibility: apiResult.compatibility,
          isExact: apiResult.is_exact,
          calorieCapApplied: apiResult.calorie_cap_applied,
          maxSubstituteCalories: apiResult.max_substitute_calories ?? calorieAllowance,
        };
        validatedByServer = true;
      } catch {
        // La base nutricional integrada permite continuar aunque el servidor
        // esté despertando o todavía no tenga todos los alimentos cargados.
      }
    }

    const equivalentGrams = Math.max(1, equivalence.grams || 1);
    const substitutedMeals = liveDietPlan.meals.map((meal, currentMealIndex) => ({
      ...meal,
      items: meal.items.map((currentItem, currentItemIndex) => currentMealIndex === mealIndex && currentItemIndex === itemIndex
        ? {
            ...currentItem,
            currentName: substituteFood.name,
            amountGrams: equivalentGrams,
            baseCarbsPer100g: substituteFood.carbsPer100g,
            baseCalsPer100g: substituteFood.calsPer100g,
            baseProteinPer100g: substituteFood.proteinPer100g,
            baseFatPer100g: substituteFood.fatPer100g,
          }
        : currentItem),
    }));
    const balancedResult = rebalanceMealsToCalorieTarget(
      substitutedMeals,
      { mealIndex, itemIndex },
      calculatedBaseCalories,
    );
    const updatedMeals = balancedResult.meals;
    const finalSubstituteItem = updatedMeals[mealIndex]?.items[itemIndex];
    const finalSubstituteGrams = finalSubstituteItem?.amountGrams ?? equivalentGrams;
    const updatedPlan = currentUser.role === 'client'
      ? { ...liveDietPlan, meals: updatedMeals }
      : { ...liveDietPlan, meals: updatedMeals, publishedAt: undefined, publishedBy: undefined };
    setLiveDietPlan(updatedPlan);
    onGenerateDiet(updatedPlan);

    const focusKey = item.category === 'protein' ? 'protein' : item.category === 'carb' ? 'carbs' : item.category === 'fat' ? 'fat' : 'calories';
    const focusLabel = item.category === 'protein' ? 'proteína' : item.category === 'carb' ? 'carbohidratos' : item.category === 'fat' ? 'grasa' : 'calorías';
    const targetValue = equivalence.original[focusKey];
    const targetMeasure = focusKey === 'calories' ? `${targetValue.toFixed(1)} kcal` : `${targetValue.toFixed(1)} g de ${focusLabel}`;
    const projectedDailyCalories = planMacros(updatedPlan).cals;
    const adjustmentNote = balancedResult.adjusted
      ? ` Para no superar el objetivo, el sistema equilibró automáticamente las demás porciones y dejó ${finalSubstituteGrams} g de ${substituteFood.name}.`
      : '';
    const capNote = equivalence.calorieCapApplied
      ? ' La equivalencia inicial también fue limitada por el objetivo calórico.'
      : '';
    const localMessage = `Equivalencia aplicada: cálculo inicial de ${equivalentGrams} g de ${substituteFood.name} para conservar ${targetMeasure}.${adjustmentNote}${capNote} Total diario: ${projectedDailyCalories}/${calculatedBaseCalories} kcal.`;

    try {
      const hasPersistentPlan = /^\d+$/.test(liveDietPlan.id);
      if (hasPersistentPlan) {
        const saved = currentUser.role === 'client'
          ? await updateMyDietPlanMealsFromApi(updatedMeals)
          : liveDietPlan.status === 'draft'
          ? await updateDietPlanInApi(liveDietPlan.id, {
              meals: updatedMeals,
              specialistDiagnosis: liveDietPlan.specialistDiagnosis,
              calculation: nutritionTargetApi || liveDietPlan.calculation,
              basedOnMetricId: nutritionTargetApi?.based_on_metric_id || liveDietPlan.basedOnMetricId,
            })
          : await createDietPlanInApi({
              ...updatedPlan,
              id: `draft-${Date.now()}`,
              status: 'draft',
              publishedAt: undefined,
              publishedBy: undefined,
              calculation: nutritionTargetApi || liveDietPlan.calculation,
              basedOnMetricId: nutritionTargetApi?.based_on_metric_id || liveDietPlan.basedOnMetricId,
            }, 'draft');
        const normalizedSaved = { ...saved, clientName: liveDietPlan.clientName };
        setLiveDietPlan(JSON.parse(JSON.stringify(normalizedSaved)));
        onGenerateDiet(normalizedSaved);
        setSubstitutionMessage(`${localMessage} Cambio guardado en el plan.${validatedByServer ? ' Validado correctamente.' : ''}`);
      } else {
        setSubstitutionMessage(`${localMessage} El profesional debe guardar el plan para hacerlo permanente.`);
      }
      setSubstitutingItem(null);
      setSubstitutionSearch('');
    } catch {
      setSubstitutionMessage(`${localMessage} El cambio quedó visible, pero no pudo guardarse. Revisa la conexión.`);
      setSubstitutingItem(null);
      setSubstitutionSearch('');
    }
  };

  const handlePublishPlans = async (scope: PublishScope) => {
    if (!canEditPlans || isPublishing) return;

    const publishDiet = scope !== 'routine' && hasPublishableDiet;
    const publishRoutine = scope !== 'diet' && hasPublishableRoutine;
    let mealsForPublication = liveDietPlan.meals;
    let automaticBalanceMessage = '';

    if (scope === 'diet' && !publishDiet) {
      setPublishStatus('No hay un plan de alimentación completo para enviar. Genera o agrega comidas primero.');
      setSaveStatus('No hay un plan de alimentación completo para enviar.');
      return;
    }
    if (scope === 'routine' && !publishRoutine) {
      setPublishStatus('No hay una rutina con ejercicios para enviar. Genera la rutina primero.');
      setRoutineStatus('No hay una rutina con ejercicios para enviar.');
      return;
    }
    if (!publishDiet && !publishRoutine) {
      setPublishStatus('No hay planes completos para publicar. Genera la alimentación o la rutina antes de continuar.');
      return;
    }

    if (publishDiet) {
      if (!nutritionTargetApi || calculatedBaseCalories <= 0) {
        const message = nutritionTargetError || 'No se envió la alimentación: faltan datos reales para calcular el objetivo.';
        setPublishStatus(message);
        setSaveStatus(message);
        return;
      }
      if (liveDietPlan.meals.filter(meal => meal.items.length > 0).length < 3) {
        const message = 'No se envió la alimentación: un plan diario debe contener al menos 3 comidas con alimentos.';
        setPublishStatus(message);
        setSaveStatus(message);
        return;
      }
      if (!nutritionCompliance.isCompliant) {
        const balanced = balanceDietMeals(
          liveDietPlan.meals,
          {
            calories: calculatedBaseCalories,
            protein: liveProtein,
            carbs: liveCarbs,
            fat: liveFat,
          },
          48,
        );
        if (!balanced.compliant) {
          const message = `No se envió la alimentación porque el menú requiere un ajuste profesional adicional. ${balanced.issues.join(' · ')}`;
          setPublishStatus(message);
          setSaveStatus(message);
          return;
        }
        mealsForPublication = balanced.meals;
        automaticBalanceMessage = ` El sistema corrigió automáticamente ${balanced.changedItems} porciones antes de publicar.`;
        const balancedPlan = { ...liveDietPlan, meals: balanced.meals, publishedAt: undefined, publishedBy: undefined };
        setLiveDietPlan(balancedPlan);
        onGenerateDiet(balancedPlan);
      }
    }

    const contentLabel = publishDiet && publishRoutine
      ? 'el plan de alimentación y la rutina de entrenamiento'
      : publishDiet
      ? 'el plan de alimentación'
      : 'la rutina de entrenamiento';
    const confirmed = typeof window === 'undefined' || window.confirm(
      `Se guardará y enviará ${contentLabel} a ${activeClientObj.name}. La app verificará el contenido directamente en el servidor antes de confirmar. ¿Continuar?`,
    );
    if (!confirmed) return;

    const publishedAt = new Date().toISOString();
    const publishedBy = currentUser.name;
    const successfulParts: string[] = [];
    const errors: string[] = [];
    let verifiedDiet: DietPlan | null = null;
    let verifiedRoutine: WorkoutRoutine | null = null;

    setIsPublishing(true);
    setPublishStatus(`Guardando ${contentLabel} y comprobando la asignación en el servidor…`);

    if (publishDiet) {
      const planToPublish: DietPlan = {
        ...liveDietPlan,
        clientId: targetClientId,
        clientName: activeClientObj.name,
        meals: mealsForPublication,
        baseCalories: calculatedBaseCalories,
        protein: liveProtein,
        carbs: liveCarbs,
        fat: liveFat,
        goal,
        generatedDate: publishedAt.split('T')[0],
        specialistDiagnosis: planNotesDraft.trim() || liveDietPlan.specialistDiagnosis,
        publishedAt: undefined,
        publishedBy: undefined,
        status: 'draft',
        calculation: nutritionTargetApi || liveDietPlan.calculation,
        basedOnMetricId: nutritionTargetApi?.based_on_metric_id || liveDietPlan.basedOnMetricId,
      };
      try {
        const draft = /^\d+$/.test(planToPublish.id) && liveDietPlan.status === 'draft'
          ? await updateDietPlanInApi(planToPublish.id, planToPublish)
          : await createDietPlanInApi(planToPublish, 'draft');
        const saved = await publishDietPlanInApi(draft.id);
        const serverPlans = await listDietPlansFromApi(targetClientId);
        const serverPlan = serverPlans.find(plan => plan.id === saved.id)
          || serverPlans.find(plan => plan.clientId === targetClientId);
        if (!serverPlan || serverPlan.meals.length === 0) {
          throw new Error('el servidor no devolvió comidas activas');
        }
        verifiedDiet = {
          ...serverPlan,
          clientName: activeClientObj.name,
          publishedAt: serverPlan.publishedAt || publishedAt,
          publishedBy: serverPlan.publishedBy || publishedBy,
        };
        setLiveDietPlan(JSON.parse(JSON.stringify(verifiedDiet)));
        setPlanNotesDraft(verifiedDiet.specialistDiagnosis || '');
        onGenerateDiet(verifiedDiet);
        successfulParts.push('alimentación');
        setSaveStatus(`Plan de alimentación enviado y verificado para ${activeClientObj.name}.${automaticBalanceMessage}`);
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'error desconocido';
        errors.push(`alimentación: ${detail}`);
        setSaveStatus('No se pudo confirmar el envío del plan de alimentación.');
      }
    }

    if (publishRoutine && defaultRoutine) {
      const routineToPublish: WorkoutRoutine = {
        ...defaultRoutine,
        clientId: targetClientId,
        clientName: activeClientObj.name,
        title: routineTitleDraft.trim() || defaultRoutine.title,
        objective: routineObjectiveDraft.trim() || defaultRoutine.objective,
        specialistAdvice: routineAdviceDraft.trim() || defaultRoutine.specialistAdvice,
        generatedDate: publishedAt.split('T')[0],
        publishedAt,
        publishedBy,
      };
      try {
        const saved = /^\d+$/.test(routineToPublish.id)
          ? await updateAssignedRoutineInApi(routineToPublish.id, routineToPublish)
          : await createAssignedRoutineInApi(routineToPublish);
        const firstRead = await listAssignedRoutinesFromApi(targetClientId);
        const serverRoutines = firstRead.length
          ? firstRead
          : await listAssignedRoutinesFromApi(targetClientId);
        const serverRoutine = serverRoutines.find(routine => routine.id === saved.id)
          || serverRoutines.find(routine => routine.clientId === targetClientId);
        const exerciseCount = serverRoutine?.days.reduce((total, day) => total + day.exercises.length, 0) || 0;
        if (!serverRoutine || serverRoutine.days.length === 0 || exerciseCount === 0) {
          throw new Error('la asignación activa existe, pero el servidor no devolvió días y ejercicios completos');
        }
        const deliveryHealth = await getClientRoutineDeliveryHealthFromApi(targetClientId);
        if (!deliveryHealth.delivery_ready) {
          const reasons = deliveryHealth.blocking_reasons.length
            ? deliveryHealth.blocking_reasons.join('; ')
            : 'el acceso del cliente no pudo verificarse';
          throw new Error(`la rutina quedó guardada, pero no está disponible para el cliente: ${reasons}`);
        }
        verifiedRoutine = {
          ...serverRoutine,
          clientName: activeClientObj.name,
          publishedAt: serverRoutine.publishedAt || publishedAt,
          publishedBy: serverRoutine.publishedBy || publishedBy,
        };
        setActiveRoutine(verifiedRoutine);
        setRoutineTitleDraft(verifiedRoutine.title);
        setRoutineObjectiveDraft(verifiedRoutine.objective);
        setRoutineAdviceDraft(verifiedRoutine.specialistAdvice || '');
        onGenerateRoutine(verifiedRoutine);
        successfulParts.push('entrenamiento');
        setRoutineStatus(`Rutina enviada y verificada para ${activeClientObj.name}: ${verifiedRoutine.days.length} días y ${exerciseCount} ejercicios.`);
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'error desconocido';
        errors.push(`entrenamiento: ${detail}`);
        setRoutineStatus(`No se pudo confirmar la entrega de la rutina: ${detail}.`);
      }
    }

    if (successfulParts.length > 0) {
      setLastPublishedAt(publishedAt);
    }
    if (errors.length === 0) {
      setPublishStatus(`Envío confirmado para ${activeClientObj.name}: ${successfulParts.join(' y ')} guardados y verificados. Verificado ${formatPublicationDate(publishedAt)}.`);
    } else if (successfulParts.length > 0) {
      setPublishStatus(`Envío parcial: se confirmó ${successfulParts.join(' y ')}, pero falló ${errors.join(' · ')}.`);
    } else {
      setPublishStatus(`No se confirmó ningún envío. ${errors.join(' · ')}`);
    }
    setIsPublishing(false);
  };

  const handleSavePrescription = async () => {
    await handlePublishPlans('diet');
  };

  const handleAddManualItem = () => {
    if (!manualFoodName.trim() || manualGrams <= 0) return;
    const macroValidation = validateFoodCaloriesPer100g(manualProteinPer100, manualCarbsPer100, manualFatPer100, manualCalsPer100);
    if (!macroValidation.isConsistent) {
      setSaveStatus(`No se agregó: los macros equivalen aproximadamente a ${macroValidation.calculated} kcal/100g, pero ingresaste ${manualCalsPer100} kcal. Corrige proteína, carbohidratos, grasa o calorías.`);
      return;
    }
    const newItem: DietMealItem = {
      id: `manual-${Date.now()}`,
      originalName: manualFoodName.trim(),
      currentName: manualFoodName.trim(),
      amountGrams: manualGrams,
      baseCarbsPer100g: Math.max(0, manualCarbsPer100),
      baseCalsPer100g: Math.max(0, manualCalsPer100),
      baseProteinPer100g: Math.max(0, manualProteinPer100),
      baseFatPer100g: Math.max(0, manualFatPer100),
      category: manualCategory,
    };
    const mealName = manualMealName.trim() || 'Comida Personalizada';
    const existingIndex = liveDietPlan.meals.findIndex(meal => meal.name.toLowerCase() === mealName.toLowerCase());
    const meals = [...liveDietPlan.meals];
    if (existingIndex >= 0) {
      meals[existingIndex] = { ...meals[existingIndex], items: [...meals[existingIndex].items, newItem] };
    } else {
      meals.push({ name: mealName, items: [newItem] });
    }
    const updated = {
      ...liveDietPlan,
      meals,
      baseCalories: calculatedBaseCalories,
      protein: liveProtein,
      carbs: liveCarbs,
      fat: liveFat,
      specialistDiagnosis: planNotesDraft || `Plan editado manualmente por ${currentUser.name}. Calorías objetivo: ${calculatedBaseCalories}.`,
      publishedAt: undefined,
      publishedBy: undefined,
    };
    setLiveDietPlan(updated);
    onGenerateDiet(updated);
    setSaveStatus('Alimento agregado manualmente. Pulsa Guardar y enviar alimentación para confirmarlo al cliente.');
  };

  const handleCreateFood = async () => {
    if (!canEditPlans || !newFoodName.trim()) return;
    try {
      const created = await createFoodInApi({
        name: newFoodName.trim(),
        category: newFoodCategory,
        protein_per_100g: newFoodProtein,
        carbs_per_100g: newFoodCarbs,
        fat_per_100g: newFoodFat,
        cals_per_100g: newFoodCalories,
        fiber_per_100g: newFoodFiber,
        client_note: 'Alimento agregado por el equipo Imperial Fitness.',
        trainer_note: 'Verificar tolerancia, preferencia y porción con el cliente antes de prescribirlo.',
      });
      setApiFoods(prev => [created, ...prev.filter(food => food.name.toLowerCase() !== created.name.toLowerCase())]);
      setNewFoodName('');
      setNewFoodProtein(0);
      setNewFoodCarbs(0);
      setNewFoodFat(0);
      setNewFoodCalories(0);
      setNewFoodFiber(0);
      setFoodAdminStatus('Alimento agregado a la base profesional y disponible para sustituciones.');
    } catch {
      setFoodAdminStatus('No se pudo agregar el alimento. Revisa que no exista y que macros/kcal sean consistentes.');
    }
  };

  const toggleFixedRoutine = (routineId: string) => {
    setExpandedFixedRoutineIds((previous) => {
      const next = new Set(previous);
      if (next.has(routineId)) next.delete(routineId);
      else next.add(routineId);
      return next;
    });
  };

  const handleLoadFixedRoutine = (template: FixedHypertrophyTemplate) => {
    if (!canEditPlans) return;
    const highSeverity = activeLimitations.filter((item) => (item.status || 'active') === 'active' && item.severity === 'alta');
    if (highSeverity.length > 0) {
      setRoutineStatus('No se cargó la plantilla fija: existe una limitación de severidad alta. Revisa el caso antes de prescribir una rutina estándar.');
      return;
    }

    const conflictingNames: string[] = [];
    const mappedDays: WorkoutRoutine['days'] = template.days.map((day) => {
      const workingExercises = day.exercises.map((exercise) => {
        const normalizedName = normalizeText(exercise.name);
        const meta = professionalExercises.find((item) => normalizeText(item.name) === normalizedName)
          || professionalExercises.find((item) => normalizeText(item.name).includes(normalizedName) || normalizedName.includes(normalizeText(item.name)));
        if (meta && exerciseConflictsWithLimitations(meta, activeClientObj, activeLimitations)) {
          conflictingNames.push(meta.name);
        }
        return {
          exerciseId: meta?.id,
          name: meta?.name || exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          rest: exercise.rest,
          equipment: meta?.equipment || 'Equipo de gimnasio',
          segment: meta?.segment,
          block: inferRoutineBlock({
            name: meta?.name || exercise.name,
            primaryMuscle: meta?.primaryMuscle,
            muscleGroups: meta?.muscleGroups,
            segment: meta?.segment,
            movement: meta?.movement,
          }),
          imageUrl: meta?.imageUrl,
          muscleGroups: meta?.muscleGroups,
          notes: `${exercise.notes || ''}${exercise.tempo ? ` Tempo recomendado: ${exercise.tempo}.` : ''}`.trim(),
        };
      });

      return {
        day: day.day,
        focus: day.focus,
        exercises: [
          ...buildWarmupExercises(day.focus),
          ...workingExercises,
          {
            name: 'Enfriamiento y movilidad',
            sets: 1,
            reps: '5-8 min',
            rest: 'Sin pausa',
            equipment: 'Sin equipo',
            segment: 'full_body',
            block: 'Movilidad',
            muscleGroups: [],
            notes: day.cooldown,
          },
        ],
      };
    });

    const existingId = defaultRoutine && /^\d+$/.test(defaultRoutine.id) ? defaultRoutine.id : `fixed-${template.id}-${Date.now()}`;
    const routine: WorkoutRoutine = {
      id: existingId,
      clientId: targetClientId,
      clientName: activeClientObj.name,
      title: template.title,
      objective: `${template.description} Objetivo principal: hipertrofia con progresión estable y ejercicios base constantes.`,
      generatedDate: new Date().toISOString().split('T')[0],
      days: mappedDays,
      specialistAdvice: `${template.trainerRationale} ${template.weeklyVolume} Intensidad: ${template.intensityGuide} Progresión: ${template.progressionGuide}`,
      autoGenerated: false,
      safetyReviewRequired: conflictingNames.length > 0,
      safetySummary: conflictingNames.length
        ? `Revisión necesaria por limitaciones activas. Ejercicios a revisar: ${Array.from(new Set(conflictingNames)).join(', ')}.`
        : limitationSummary(activeLimitations),
      excludedExercisesCount: 0,
      presetId: template.id,
      presetVersion: template.version,
      presetAudience: template.audience,
      structureLocked: true,
      weeklyVolumeSummary: template.weeklyVolume,
      progressionGuide: template.progressionGuide,
      publishedAt: undefined,
      publishedBy: undefined,
    };

    setActiveRoutine(routine);
    setRoutineTitleDraft(routine.title);
    setRoutineObjectiveDraft(routine.objective);
    setRoutineAdviceDraft(routine.specialistAdvice);
    setSelectedRoutineDayIndex(0);
    setSelectedRoutineExerciseKeys(new Set());
    onGenerateRoutine(routine);
    setRoutineStatus(conflictingNames.length
      ? `Plantilla ${template.title} cargada como borrador, pero ${conflictingNames.length} ejercicio(s) requieren revisión por limitaciones activas. No la envíes sin revisar.`
      : `Plantilla ${template.title} cargada para ${activeClientObj.name}. La estructura de ejercicios quedó bloqueada; ajusta observaciones o progresión y pulsa Guardar y enviar rutina.`);
  };

  const handleUnlockFixedRoutineStructure = () => {
    if (!defaultRoutine?.structureLocked) return;
    const confirmed = typeof window === 'undefined' || window.confirm('La rutina dejará de estar protegida como plantilla fija y podrás agregar, retirar o reemplazar ejercicios. ¿Desbloquear estructura?');
    if (!confirmed) return;
    const unlocked = { ...defaultRoutine, structureLocked: false };
    setActiveRoutine(unlocked);
    onGenerateRoutine(unlocked);
    setRoutineStatus('Estructura desbloqueada. Los cambios de ejercicios quedarán bajo revisión del entrenador.');
  };

  const handleCreateRoutineTemplate = async () => {
    if (!canEditPlans) return;
    try {
      const title = routineTitleDraft.trim() || `Rutina manual ${trainingGoal} ${trainingLevel}`;
      const template = await createRoutineTemplateInApi({
        title,
        target_goal: trainingGoal,
        level: trainingLevel,
        days_per_week: selectedTrainingDays.length || 3,
        description: routineObjectiveDraft.trim() || 'Plantilla manual creada por entrenador Imperial Fitness.',
        trainer_rationale: routineAdviceDraft.trim() || 'Progresión basada en nivel, técnica, adherencia y respuesta individual.',
        payload_json: JSON.stringify({ days: [] }),
      });
      setApiRoutines(prev => [template, ...prev.filter(row => row.id !== template.id)]);
      setTemplateStatus('Plantilla manual de rutina guardada en la base profesional.');
    } catch {
      setTemplateStatus('No se pudo crear la plantilla manual de rutina. Verifica tu sesión e intenta nuevamente.');
    }
  };

  const toggleRoutine = (routineId: string) => {
    setExpandedRoutineIds(prev => {
      const next = new Set(prev);
      if (next.has(routineId)) next.delete(routineId);
      else next.add(routineId);
      return next;
    });
  };

  const toggleTrainingDay = (day: string) => {
    setSelectedTrainingDays(prev => prev.includes(day) ? prev.filter(item => item !== day) : [...prev, day]);
  };

  const toggleCustomMuscleTarget = (day: string, target: RoutineMuscleTarget) => {
    setCustomWeeklyPlanDraft(prev => {
      const current = prev[day] || [];
      const nextDay = current.includes(target) ? current.filter(item => item !== target) : [...current, target];
      return { ...prev, [day]: nextDay };
    });
    if (!selectedTrainingDays.includes(day)) {
      setSelectedTrainingDays(prev => TRAINING_DAYS.filter(item => [...prev, day].includes(item)));
    }
  };

  const handleGenerateRoutine = async () => {
    if (!canEditPlans) return;

    const highSeverity = activeLimitations.filter(item => (item.status || 'active') === 'active' && item.severity === 'alta');
    if (highSeverity.length > 0) {
      setRoutineStatus('Generación automática bloqueada: existe una limitación de severidad alta. Revisa el caso y prescribe manualmente después de valoración profesional.');
      return;
    }
    if (!routineGenerationCatalog.length) {
      setRoutineStatus(`No hay ejercicios disponibles para generar con la fuente ${routineExerciseSourceLabel}. Cambia a Todas o Imperial Fitness.`);
      return;
    }
    if (useCustomWeeklySplit && customWeeklyPlanForGeneration.length === 0) {
      setRoutineStatus('Selecciona al menos un día y uno o más grupos musculares para generar la semana personalizada.');
      return;
    }

    let routine: WorkoutRoutine;
    try {
      routine = generateImperialRoutine({
        client: activeClientObj,
        goal: trainingGoal,
        level: trainingLevel,
        selectedDays: selectedTrainingDays,
        split: trainingSplit,
        rotationKey: Date.now(),
        limitations: activeLimitations,
        intensityMode: trainingIntensityMode,
        exerciseCatalog: routineGenerationCatalog,
        exerciseSource: routineExerciseSource,
        customWeeklyPlan: useCustomWeeklySplit ? customWeeklyPlanForGeneration : undefined,
      });
    } catch (error) {
      setRoutineStatus(error instanceof Error ? error.message : 'No fue posible generar una rutina segura.');
      return;
    }
    setRoutineStatus('Validando y guardando la rutina segura…');
    try {
      const saved = await createAssignedRoutineInApi(routine);
      setActiveRoutine(saved);
      setRoutineTitleDraft(saved.title);
      setRoutineObjectiveDraft(saved.objective);
      setRoutineAdviceDraft(saved.specialistAdvice || '');
      onGenerateRoutine(saved);
      setRoutineStatus(`Rutina generada con un catálogo cerrado de ${routineGenerationCatalog.length} ejercicios de hipertrofia verificados (máquinas, poleas, Smith o mancuernas) de fuente ${routineExerciseSourceLabel}${useCustomWeeklySplit ? ` · Semana personalizada: ${customWeeklySummary}` : ''}. Revisa la rutina y pulsa Guardar y enviar rutina para confirmar la versión final al cliente.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'error desconocido';
      setRoutineStatus(`La rutina no fue asignada: ${detail}`);
    }
  };



  const handleUpdateActiveRoutine = async () => {
    await handlePublishPlans('routine');
  };


  const handleDeactivateActiveRoutine = async () => {
    if (!canEditPlans || !defaultRoutine) return;
    try {
      await deactivateAssignedRoutineInApi(defaultRoutine.id);
      setActiveRoutine(null);
      setRoutineTitleDraft('');
      setRoutineObjectiveDraft('');
      setRoutineAdviceDraft('');
      onRemoveRoutine?.(defaultRoutine.clientId);
      setRoutineStatus('Rutina retirada del cliente. El historial queda protegido.');
    } catch {
      setRoutineStatus('No se pudo retirar la rutina. Revisa conexión, token o permisos.');
    }
  };

  const handleDeleteActiveDiet = async () => {
    if (!canEditPlans || !liveDietPlan || liveDietPlan.id.startsWith('empty-') || liveDietPlan.id.startsWith('auto-')) return;
    try {
      await deleteDietPlanInApi(liveDietPlan.id);
      const empty = createEmptyDiet(activeClientObj);
      setLiveDietPlan(empty);
      setPlanNotesDraft(empty.specialistDiagnosis || '');
      onRemoveDiet?.(targetClientId);
      setSaveStatus('Plan nutricional retirado del cliente correctamente.');
    } catch {
      setSaveStatus('No se pudo retirar el plan nutricional. Revisa conexión, token o permisos.');
    }
  };


  if (currentUser.role === 'client') {
    const hasDietRecord = /^\d+$/.test(liveDietPlan.id);
    const hasDiet = hasDietRecord && liveDietPlan.meals.length > 0;
    const hasRoutineRecord = Boolean(defaultRoutine && /^\d+$/.test(defaultRoutine.id));
    const routineExerciseCount = defaultRoutine?.days.reduce((total, day) => total + day.exercises.length, 0) || 0;
    const hasRoutine = Boolean(hasRoutineRecord && defaultRoutine && defaultRoutine.days.length > 0 && routineExerciseCount > 0);
    const clientPublicationAt = [liveDietPlan.publishedAt, defaultRoutine?.publishedAt]
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 animate-fade-in">
        <header className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5 shadow-xl shadow-black/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ZoomableAvatar src={currentUser.avatar} alt={currentUser.name} className="h-12 w-12 rounded-full border-2 border-red-600" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Imperial Fitness</span>
                <h1 className="text-2xl font-black text-white">Mi plan</h1>
                <p className="text-xs text-neutral-400">Abre solo la sección que necesitas consultar.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refreshAssignedPlans(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-xs font-black text-white transition-colors hover:border-red-600 hover:bg-neutral-800"
            >
              <RefreshCw className="h-4 w-4 text-red-500" /> Actualizar plan
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-neutral-800 bg-black/35 p-3 text-center">
              <span className="block text-[9px] font-black uppercase tracking-wide text-neutral-500">Peso</span>
              <strong className="text-base text-white">{weight > 0 ? `${weight} kg` : 'Sin dato'}</strong>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-black/35 p-3 text-center">
              <span className="block text-[9px] font-black uppercase tracking-wide text-neutral-500">Grasa</span>
              <strong className="text-base text-white">{bodyFat > 0 ? `${bodyFat}%` : 'Sin dato'}</strong>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-black/35 p-3 text-center">
              <span className="block text-[9px] font-black uppercase tracking-wide text-neutral-500">Músculo</span>
              <strong className="text-base text-white">{muscleMass > 0 ? `${muscleMass} kg` : 'Sin dato'}</strong>
            </div>
          </div>
          {clientPublicationAt && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-900/60 bg-emerald-950/20 px-3 py-2.5 text-[11px] text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Última publicación confirmada: <b>{formatPublicationDate(clientPublicationAt)}</b>{(defaultRoutine?.publishedBy || liveDietPlan.publishedBy) ? ` por ${defaultRoutine?.publishedBy || liveDietPlan.publishedBy}` : ''}.</span>
            </div>
          )}
        </header>

        <details className="group overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 shadow-xl shadow-black/20">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 marker:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-600/15 text-red-400">
                <Dumbbell className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-black text-white">Rutina de entrenamiento</h2>
                <p className="truncate text-xs text-neutral-400">
                  {hasRoutine ? `${defaultRoutine?.title} · ${defaultRoutine?.days.length} días` : hasRoutineRecord ? 'Asignación activa incompleta' : 'Pendiente de asignación'}
                </p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 shrink-0 text-neutral-500 transition-transform group-open:rotate-180" />
          </summary>

          <div className="border-t border-neutral-800 p-4 sm:p-5">
            {!hasRoutine || !defaultRoutine ? (
              hasRoutineRecord ? (
                <div className="rounded-2xl border border-amber-800/60 bg-amber-950/20 p-6 text-center">
                  <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
                  <p className="mt-2 text-sm font-black text-amber-100">La asignación existe, pero la rutina está incompleta</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-200/80">El servidor encontró una rutina activa, pero no recibió días y ejercicios completos. Tu entrenador debe abrir tu expediente y presionar <b>Guardar y enviar rutina</b>.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-800 bg-black/30 p-6 text-center">
                  <Dumbbell className="mx-auto h-8 w-8 text-neutral-700" />
                  <p className="mt-2 text-sm font-black text-neutral-300">Aún no tienes una rutina activa</p>
                  <p className="mt-1 text-xs text-neutral-500">Tu entrenador debe asignarla desde el panel administrativo.</p>
                </div>
              )
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-neutral-800 bg-black/30 p-3">
                  <p className="text-sm font-black text-white">{defaultRoutine.title}</p>
                  <p className="mt-1 text-xs text-neutral-400">{defaultRoutine.objective}</p>
                </div>

                {defaultRoutine.days.map((day, dayIndex) => (
                  <details key={`${day.day}-${dayIndex}`} className="group/day rounded-2xl border border-neutral-800 bg-neutral-900/35">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden">
                      <div>
                        <span className="text-sm font-black text-white">{day.day}</span>
                        <span className="ml-2 text-xs text-neutral-500">{day.focus} · {day.exercises.length} ejercicios</span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open/day:rotate-180" />
                    </summary>
                    <div className="space-y-3 border-t border-neutral-800 p-3">
                      {day.exercises.map((exercise, exerciseIndex) => {
                        const catalogMeta = catalogForExercise(exercise);
                        const displayName = displayRoutineExerciseName(exercise, catalogMeta);
                        const logKey = workoutLogKey(dayIndex, exerciseIndex);
                        const logDraft = workoutLogDrafts[logKey] || { weightKg: '', reps: '', setNumber: '1', rir: '', notes: '' };
                        const recentExerciseLogs = workoutHistory
                          .filter((entry) => entry.exercise_name.trim().toLowerCase() === displayName.trim().toLowerCase())
                          .slice(0, 3);
                        return (
                          <article key={`${exercise.exerciseId || exercise.name}-${exerciseIndex}`} className="rounded-2xl border border-neutral-800 bg-black/35 p-3">
                            <div className="flex gap-3">
                              <ExerciseImage
                                name={displayName}
                                imageUrl={catalogMeta?.imageUrl || exercise.imageUrl}
                                imageStartUrl={catalogMeta?.imageStartUrl}
                                imageEndUrl={catalogMeta?.imageEndUrl}
                                animationUrl={catalogMeta?.animationUrl}
                                videoUrl={catalogMeta?.videoUrl}
                                primaryMuscle={catalogMeta?.primaryMuscle}
                                muscleGroups={catalogMeta?.muscleGroups || exercise.muscleGroups}
                                equipment={catalogMeta?.equipment || exercise.equipment}
                                coachingNotes={catalogMeta?.coachingNotes || exercise.notes}
                                compact
                                className="shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-black text-red-400">Ejercicio {exerciseIndex + 1}</span>
                                <h3 className="text-sm font-black leading-tight text-white">{displayName}</h3>
                                <p className="mt-1 text-xs text-neutral-300">{exercise.sets || 3} series × {exercise.reps || '10-12'} reps</p>
                                <p className="text-[10px] text-neutral-500">Descanso: {exercise.rest || '60-90s'}</p>
                              </div>
                            </div>

                            <details className="mt-3 rounded-xl border border-sky-900/50 bg-sky-950/10 p-3">
                              <summary className="cursor-pointer text-xs font-black text-sky-300">Registrar ejercicio</summary>
                              <div className="mt-3 space-y-2">
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                  <input aria-label="Peso en kilogramos" type="number" min="0" step="0.5" value={logDraft.weightKg} onChange={(event) => updateWorkoutLogDraft(logKey, 'weightKg', event.target.value)} placeholder="Peso kg" className="rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white outline-none focus:border-sky-500" />
                                  <input aria-label="Repeticiones realizadas" type="number" min="1" value={logDraft.reps} onChange={(event) => updateWorkoutLogDraft(logKey, 'reps', event.target.value)} placeholder="Reps" className="rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white outline-none focus:border-sky-500" />
                                  <input aria-label="Número de serie" type="number" min="1" value={logDraft.setNumber} onChange={(event) => updateWorkoutLogDraft(logKey, 'setNumber', event.target.value)} placeholder="Serie" className="rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white outline-none focus:border-sky-500" />
                                  <input aria-label="Repeticiones en reserva" type="number" min="0" max="10" value={logDraft.rir} onChange={(event) => updateWorkoutLogDraft(logKey, 'rir', event.target.value)} placeholder="RIR" className="rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white outline-none focus:border-sky-500" />
                                </div>
                                <input value={logDraft.notes} onChange={(event) => updateWorkoutLogDraft(logKey, 'notes', event.target.value)} placeholder="Nota opcional" className="w-full rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white outline-none focus:border-sky-500" />
                                <button type="button" disabled={savingWorkoutLogKey === logKey} onClick={() => void saveWorkoutExerciseLog(logKey, displayName)} className="w-full rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-500 disabled:opacity-50">
                                  {savingWorkoutLogKey === logKey ? 'Guardando…' : 'Guardar registro'}
                                </button>
                                {workoutLogStatus[logKey] && <p className="text-[10px] text-sky-100">{workoutLogStatus[logKey]}</p>}
                                {recentExerciseLogs.length > 0 && (
                                  <div className="space-y-1 rounded-xl border border-neutral-800 bg-black/30 p-2">
                                    <p className="text-[9px] font-black uppercase text-neutral-500">Últimos registros</p>
                                    {recentExerciseLogs.map((entry) => (
                                      <p key={entry.id} className="text-[10px] text-neutral-300">
                                        {new Date(entry.created_at).toLocaleDateString('es-CO')} · {entry.weight_kg} kg × {entry.reps}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </details>
                          </article>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </details>

        <details className="group overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 shadow-xl shadow-black/20">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 marker:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600/15 text-emerald-400">
                <Utensils className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-black text-white">Plan de alimentación</h2>
                <p className="truncate text-xs text-neutral-400">
                  {hasDiet ? `${liveDietPlan.baseCalories} kcal · ${liveDietPlan.meals.length} comidas` : hasDietRecord ? 'Plan activo incompleto' : 'Pendiente de asignación'}
                </p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 shrink-0 text-neutral-500 transition-transform group-open:rotate-180" />
          </summary>

          <div className="border-t border-neutral-800 p-4 sm:p-5">
            {!hasDiet ? (
              hasDietRecord ? (
                <div className="rounded-2xl border border-amber-800/60 bg-amber-950/20 p-6 text-center">
                  <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
                  <p className="mt-2 text-sm font-black text-amber-100">El plan está activo, pero no contiene comidas</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-200/80">Tu entrenador debe revisar el menú y presionar <b>Guardar y enviar alimentación</b> para completar la publicación.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-800 bg-black/30 p-6 text-center">
                  <Utensils className="mx-auto h-8 w-8 text-neutral-700" />
                  <p className="mt-2 text-sm font-black text-neutral-300">Aún no tienes un plan de alimentación activo</p>
                  <p className="mt-1 text-xs text-neutral-500">Tu entrenador debe asignarlo desde el panel administrativo.</p>
                </div>
              )
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-xl border border-neutral-800 bg-black/35 p-2"><span className="block text-[9px] text-neutral-500">Kcal</span><strong className="text-sm text-white">{liveDietPlan.baseCalories}</strong></div>
                  <div className="rounded-xl border border-neutral-800 bg-black/35 p-2"><span className="block text-[9px] text-neutral-500">Proteína</span><strong className="text-sm text-white">{liveDietPlan.protein}g</strong></div>
                  <div className="rounded-xl border border-neutral-800 bg-black/35 p-2"><span className="block text-[9px] text-neutral-500">Carbos</span><strong className="text-sm text-white">{liveDietPlan.carbs}g</strong></div>
                  <div className="rounded-xl border border-neutral-800 bg-black/35 p-2"><span className="block text-[9px] text-neutral-500">Grasas</span><strong className="text-sm text-white">{liveDietPlan.fat}g</strong></div>
                </div>

                {liveDietPlan.meals.map((meal, mealIndex) => (
                  <details key={`${meal.name}-${mealIndex}`} className="group/meal rounded-2xl border border-neutral-800 bg-neutral-900/35">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden">
                      <div>
                        <span className="text-sm font-black text-white">{meal.name}</span>
                        <span className="ml-2 text-xs text-neutral-500">{meal.items.length} alimentos · {mealMacros(meal).cals} kcal</span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open/meal:rotate-180" />
                    </summary>
                    <div className="space-y-2 border-t border-neutral-800 p-3">
                      {meal.items.map((item, itemIndex) => (
                        <div key={`${item.id}-${itemIndex}`} className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-black/35 p-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-black text-white">{item.currentName}</p>
                            <p className="text-[10px] text-neutral-400">Cantidad: {Math.round(item.amountGrams)} g</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSubstitutionMessage('');
                              setSubstitutionSearch('');
                              setSubstitutingItem({ mealIndex, itemIndex, item });
                            }}
                            className="shrink-0 rounded-lg border border-amber-800/70 bg-amber-950/25 px-2.5 py-2 text-[10px] font-black text-amber-200 hover:border-amber-500"
                          >
                            Sustituir
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
                <div className={`rounded-2xl border p-4 ${publishedPlanCompliance.status === 'on_target' ? 'border-emerald-900/60 bg-emerald-950/15' : 'border-amber-900/60 bg-amber-950/15'}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">Total del día</p>
                      <p className="mt-1 text-lg font-black text-white">{currentPlanMacros.cals} / {liveDietPlan.baseCalories} kcal</p>
                      <p className="mt-1 text-[10px] text-neutral-400">Diferencia: {publishedPlanCompliance.percentDifference}% respecto de la meta publicada.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl border border-neutral-800 bg-black/30 px-3 py-2"><span className="block text-[9px] text-neutral-500">Proteína</span><strong className="text-xs text-white">{currentPlanMacros.protein}/{liveDietPlan.protein}g</strong></div>
                      <div className="rounded-xl border border-neutral-800 bg-black/30 px-3 py-2"><span className="block text-[9px] text-neutral-500">Carbos</span><strong className="text-xs text-white">{currentPlanMacros.carbs}/{liveDietPlan.carbs}g</strong></div>
                      <div className="rounded-xl border border-neutral-800 bg-black/30 px-3 py-2"><span className="block text-[9px] text-neutral-500">Grasas</span><strong className="text-xs text-white">{currentPlanMacros.fat}/{liveDietPlan.fat}g</strong></div>
                    </div>
                  </div>
                </div>
                {substitutionMessage && <p className="rounded-xl border border-emerald-900/50 bg-emerald-950/15 p-3 text-xs text-emerald-200">{substitutionMessage}</p>}
              </div>
            )}
          </div>
        </details>

        {saveStatus && <p className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">{saveStatus}</p>}
        {routineStatus && <p className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">{routineStatus}</p>}

        {substitutingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm">
            <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-neutral-800 p-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wide text-amber-400">Sustituir alimento</span>
                  <h3 className="text-sm font-black text-white">{substitutingItem.item.currentName}</h3>
                </div>
                <button type="button" onClick={() => { setSubstitutingItem(null); setSubstitutionSearch(''); }} className="rounded-lg px-3 py-2 text-sm font-black text-neutral-400 hover:bg-neutral-900 hover:text-white">✕</button>
              </div>
              <div className="space-y-3 overflow-y-auto p-4">
                <input value={substitutionSearch} onChange={(event) => setSubstitutionSearch(event.target.value)} placeholder="Buscar alternativa…" className="w-full rounded-xl border border-neutral-800 bg-black px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500" />
                <p className="text-[11px] text-neutral-400">Selecciona una alternativa. La app calculará la cantidad y guardará el cambio sin superar el objetivo diario.</p>
                <div className="space-y-2">
                  {getSubstitutionOptions(substitutingItem.item).map((food) => {
                    const preview = calculateMacroAwareEquivalence(substitutingItem.item, food, { maxSubstituteCalories: substitutionCalorieAllowance(substitutingItem.item) });
                    return (
                      <button key={food.id || food.name} type="button" onClick={() => void handlePerformSubstitution(food)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/45 p-3 text-left hover:border-amber-500">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-white">{food.name}</p>
                          <p className="text-[10px] text-neutral-500">{food.calsPer100g} kcal por 100 g</p>
                        </div>
                        <span className="shrink-0 text-xs font-black text-amber-300">{Math.round(preview.grams)} g</span>
                      </button>
                    );
                  })}
                  {getSubstitutionOptions(substitutingItem.item).length === 0 && (
                    <p className="rounded-xl border border-neutral-800 bg-black/30 p-4 text-center text-xs text-neutral-500">No hay alternativas compatibles con esta búsqueda.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }


  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      
      {/* HEADER DE MÓDULO */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 p-6 rounded-2xl border border-neutral-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/80 text-xs text-red-400 mb-2 tracking-wider uppercase font-medium">
            <UserCheck className="w-3.5 h-3.5" /> Supervisión Humana Especializada
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Plan Personalizado de Nutrición y Entrenamiento
          </h1>
          <p className="text-neutral-400 text-sm mt-1 max-w-xl leading-relaxed font-light">
            Cálculo trazable basado en datos corporales registrados, porciones individualizadas y sustituciones con equivalencia nutricional. La publicación final requiere revisión profesional cuando existan restricciones relevantes.
          </p>
        </div>

        {/* Selector de Cliente si es admin o trainer */}
        {canEditPlans && (
          <div className="w-full lg:w-auto bg-black/60 p-3 rounded-xl border border-neutral-800 flex items-center gap-3">
            <span className="text-xs text-neutral-400 font-medium whitespace-nowrap">Expediente de:</span>
            <select
              value={targetClientId}
              onChange={(e) => setTargetClientId(e.target.value)}
              className="bg-neutral-900 text-white text-sm font-semibold rounded-lg px-3 py-2 border border-neutral-700 focus:outline-none focus:border-red-600 transition-colors w-full lg:w-48"
            >
              {clientsOnly.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {activeClientObj && (
              <ZoomableAvatar src={activeClientObj.avatar} alt={activeClientObj.name} className="h-10 w-10 rounded-full border-red-600" />
            )}
          </div>
        )}

      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
        <div>
          <p className="text-sm font-bold text-white">Sincronización de asignaciones</p>
          <p className="text-xs text-neutral-400 mt-1">Actualiza la dieta y rutina activas del cliente seleccionado sin cerrar sesión.</p>
        </div>
        <button
          type="button"
          onClick={() => refreshAssignedPlans(true)}
          className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-red-600 text-xs font-bold text-white transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4 text-red-500" /> Sincronizar plan asignado
        </button>
      </div>

      {canEditPlans && (
        <section className="rounded-3xl border border-emerald-800/60 bg-gradient-to-br from-emerald-950/35 via-neutral-950 to-neutral-950 p-5 shadow-xl shadow-black/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-700/60 bg-emerald-500/10 text-emerald-300">
                  <Send className="h-5 w-5" />
                </span>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Centro de publicación</span>
                  <h2 className="text-lg font-black text-white">Guardar y enviar al cliente</h2>
                </div>
              </div>
              <p className="mt-3 max-w-3xl text-xs leading-relaxed text-neutral-300">
                Esta es la confirmación final. Guarda la versión que ves en pantalla, la envía a <b className="text-white">{activeClientObj.name}</b> y vuelve a consultar el servidor. Solo muestra éxito cuando la dieta contiene comidas y la rutina contiene días y ejercicios reales.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${dietReadyForPublication ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300' : 'border-amber-900/70 bg-amber-950/25 text-amber-300'}`}>
                  {dietReadyForPublication ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />} Alimentación {dietReadyForPublication ? 'lista' : 'requiere ajuste'}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${hasPublishableRoutine ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300' : 'border-neutral-800 bg-black/30 text-neutral-500'}`}>
                  {hasPublishableRoutine ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />} Entrenamiento {hasPublishableRoutine ? 'listo' : 'pendiente'}
                </span>
                {latestPublicationAt && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-900/60 bg-sky-950/20 px-3 py-1.5 text-sky-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Última confirmación: {formatPublicationDate(latestPublicationAt)}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              disabled={isPublishing || (!hasPublishableDiet && !hasPublishableRoutine)}
              onClick={() => void handlePublishPlans('all')}
              className="inline-flex min-h-14 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-950/40 transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500 lg:w-auto"
            >
              {isPublishing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              {isPublishing ? 'Verificando envío…' : 'Guardar y enviar planes'}
            </button>
          </div>
          {publishStatus && (
            <p aria-live="polite" className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-semibold leading-relaxed ${/no se|falló|error|parcial|pendiente/i.test(publishStatus) ? 'border-amber-900/60 bg-amber-950/20 text-amber-200' : 'border-emerald-900/60 bg-emerald-950/20 text-emerald-200'}`}>
              {publishStatus}
            </p>
          )}
        </section>
      )}

      {/* GUÍA CLARA DE OPCIONES (Requerido para explicar el funcionamiento) */}
      <div className="bg-neutral-950/90 border-l-4 border-red-600 p-5 rounded-r-xl border-y border-r border-neutral-900">
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="w-4 h-4 text-red-500 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Guía de Operación Dinámica de la App</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-400 mt-2">
          <div className="bg-neutral-900/50 p-3 rounded-lg">
            <span className="text-white font-semibold block mb-1">1. Recálculo en Vivo</span>
            Mueve los controles de Peso, Grasa o Masa Muscular. Verás cómo cambian instantáneamente las calorías y porciones en toda la pantalla.
          </div>
          <div className="bg-neutral-900/50 p-3 rounded-lg">
            <span className="text-white font-semibold block mb-1">2. Equivalencias Exactas</span>
            ¿No quieres plátano? Haz clic en <span className="text-amber-400 font-bold">"Sustituir"</span> y elige Papa cocida. El sistema te dará los gramos exactos equivalentes por regla de tres.
          </div>
          <div className="bg-neutral-900/50 p-3 rounded-lg">
            <span className="text-white font-semibold block mb-1">3. Aval Profesional</span>
            Ningún plan es un texto tirado al azar. Todo incluye la firma de validación de los entrenadores de fuerza y nutrición de Imperial Fitness.
          </div>
        </div>
      </div>

      {/* SECCIÓN BIOMÉTRICA INTERACTIVA - RECÁLCULO CONSTANTE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Controles deslizantes / Inputs */}
        <div className="lg:col-span-1 bg-neutral-950 p-5 rounded-2xl border border-neutral-800 space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-red-500" /> Biometría Actual
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">Sincronizado</span>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-400 font-medium">Peso Corporal</span>
              <span className="text-white font-bold font-mono text-sm">{weight} kg</span>
            </div>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              disabled={!canEditPlans}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white p-2 mb-2 focus:outline-none focus:border-red-600 font-mono"
            />
            <input 
              type="range" 
              min="45" 
              max="130" 
              step="0.5"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value))}
              disabled={!canEditPlans}
              className="w-full accent-red-600 bg-neutral-800 rounded-lg h-1.5 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-400 font-medium">Grasa Corporal</span>
              <span className="text-white font-bold font-mono text-sm">{bodyFat > 0 ? `${bodyFat}%` : 'Sin dato'}</span>
            </div>
            <input
              type="number"
              step="0.1"
              value={bodyFat}
              onChange={(e) => setBodyFat(parseFloat(e.target.value) || 0)}
              disabled={!canEditPlans}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white p-2 mb-2 focus:outline-none focus:border-red-600 font-mono"
            />
            <input 
              type="range" 
              min="0"
              max="45" 
              step="0.5"
              value={bodyFat}
              onChange={(e) => setBodyFat(parseFloat(e.target.value))}
              disabled={!canEditPlans}
              className="w-full accent-red-600 bg-neutral-800 rounded-lg h-1.5 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-400 font-medium">Masa Muscular</span>
              <span className="text-white font-bold font-mono text-sm">{muscleMass > 0 ? `${muscleMass} kg` : 'Sin dato'}</span>
            </div>
            <input
              type="number"
              step="0.1"
              value={muscleMass}
              onChange={(e) => setMuscleMass(parseFloat(e.target.value) || 0)}
              disabled={!canEditPlans}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white p-2 mb-2 focus:outline-none focus:border-red-600 font-mono"
            />
            <input 
              type="range" 
              min="0"
              max="65" 
              step="0.5"
              value={muscleMass}
              onChange={(e) => setMuscleMass(parseFloat(e.target.value))}
              disabled={!canEditPlans}
              className="w-full accent-red-600 bg-neutral-800 rounded-lg h-1.5 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 font-medium mb-1.5">Enfoque Prescrito</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={!canEditPlans}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white p-2.5 focus:outline-none focus:border-red-600"
            >
              <option value="">Seleccionar objetivo</option>
              <option value="Pérdida de grasa">Pérdida de grasa</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Recomposición corporal">Recomposición corporal</option>
              <option value="Ganancia muscular">Ganancia muscular</option>
              <option value="Fuerza">Fuerza y rendimiento</option>
              <option value="Resistencia">Resistencia / acondicionamiento</option>
            </select>
          </div>

          {canEditPlans ? (
            <button
              onClick={handleSavePrescription}
              disabled={isPublishing || !hasPublishableDiet || !nutritionTargetApi}
              className="w-full mt-2 bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600 text-xs font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-neutral-900 disabled:border-neutral-800 disabled:text-neutral-500"
            >
              {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Guardar y enviar alimentación
            </button>
          ) : (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 text-[11px] text-neutral-400">
              Tu entrenador administra cambios de dieta y rutina. Esta vista es informativa para el cliente.
            </div>
          )}
          {saveStatus && <p className={`text-[11px] leading-relaxed ${/no se|no pudo|corrige/i.test(saveStatus) ? 'text-red-300' : 'text-emerald-400'}`}>{saveStatus}</p>}
        </div>

        {/* Dashboard de Calorías y Dieta Súper Premium */}
        <div className="lg:col-span-3 space-y-6">
          
          {(nutritionTargetLoading || nutritionTargetError || nutritionTargetApi?.warnings.length) && (
            <div className={`rounded-2xl border p-4 ${nutritionTargetError ? 'border-red-800/60 bg-red-950/20' : 'border-amber-800/50 bg-amber-950/15'}`}>
              <span className={`text-xs font-black uppercase tracking-wider ${nutritionTargetError ? 'text-red-300' : 'text-amber-300'}`}>
                {nutritionTargetLoading ? 'Calculando con datos reales…' : nutritionTargetError ? 'Cálculo bloqueado' : 'Revisión del cálculo'}
              </span>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-300">
                {nutritionTargetLoading ? 'Consultando el motor nutricional del servidor.' : nutritionTargetError || nutritionTargetApi?.warnings.join(' ')}
              </p>
              {nutritionTargetError && <p className="mt-2 text-[10px] text-neutral-400">Ve al perfil del cliente y completa peso, estatura, edad, sexo, nivel de actividad y objetivo. Si registras TMB de InBody, indica su fuente.</p>}
            </div>
          )}

          {/* BANNER MACROS RESULTANTES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-neutral-950 p-5 rounded-2xl border border-neutral-800">
            <div className="bg-black/50 p-3.5 rounded-xl border border-neutral-900 text-center">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Calorías Diarias</span>
              <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight block mt-1 font-mono">
                {calculatedBaseCalories}
              </span>
              <span className="text-[9px] text-red-400 font-medium block mt-0.5">{nutritionTargets.goalLabel}</span>
              <span className="text-[9px] text-neutral-500 block mt-0.5">Mantenimiento: {maintenanceCalories} kcal · {nutritionTargets.adjustmentPercent > 0 ? '+' : ''}{nutritionTargets.adjustmentPercent}%</span>
            </div>

            <div className="bg-black/50 p-3.5 rounded-xl border border-neutral-900 text-center">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Proteína Pura</span>
              <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight block mt-1 font-mono">
                {liveProtein}g
              </span>
              <span className="text-[9px] text-neutral-400 block mt-0.5">{(liveProtein / Math.max(weight, 1)).toFixed(1)}g/kg según objetivo</span>
            </div>

            <div className="bg-black/50 p-3.5 rounded-xl border border-neutral-900 text-center">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Carbohidratos</span>
              <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight block mt-1 font-mono">
                {liveCarbs}g
              </span>
              <span className="text-[9px] text-neutral-400 block mt-0.5">Energía glucogénica</span>
            </div>

            <div className="bg-black/50 p-3.5 rounded-xl border border-neutral-900 text-center">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Grasas Saludables</span>
              <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight block mt-1 font-mono">
                {liveFat}g
              </span>
              <span className="text-[9px] text-neutral-400 block mt-0.5">Soporte hormonal</span>
            </div>
          </div>

          {liveDietPlan.meals.length > 0 && (
            <div className={`rounded-2xl border p-4 ${calorieCompliance.status === 'on_target' ? 'border-emerald-900/50 bg-emerald-950/10' : calorieCompliance.status === 'near_target' ? 'border-amber-900/50 bg-amber-950/10' : 'border-red-900/50 bg-red-950/10'}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <span className={`block text-xs font-black uppercase tracking-wider ${calorieCompliance.status === 'on_target' ? 'text-emerald-300' : calorieCompliance.status === 'near_target' ? 'text-amber-300' : 'text-red-300'}`}>Total diario consumido</span>
                  <p className="mt-1 text-[11px] leading-relaxed text-neutral-300">
                    Consumido: <b>{currentPlanMacros.cals} kcal</b> de <b>{calculatedBaseCalories} kcal</b>. {calorieCompliance.remaining > 0 ? `Faltan ${calorieCompliance.remaining} kcal.` : calorieCompliance.excess > 0 ? `Exceso de ${calorieCompliance.excess} kcal.` : 'Objetivo exacto.'} Diferencia: {calorieCompliance.percentDifference}%.
                  </p>
                  <p className="mt-1 text-[10px] text-neutral-500">{nutritionTargets.rationale} Los totales se calculan con los gramos y valores por 100g de cada alimento elegido.</p>
                </div>
                <div className="grid shrink-0 grid-cols-4 gap-2 text-center">
                  <div className="rounded-xl border border-neutral-800 bg-black/35 px-2 py-2"><span className="block text-[9px] uppercase text-neutral-400">Kcal</span><strong className="text-sm font-mono text-white">{currentPlanMacros.cals}</strong></div>
                  <div className="rounded-xl border border-neutral-800 bg-black/35 px-2 py-2"><span className="block text-[9px] uppercase text-neutral-400">Prot</span><strong className="text-sm font-mono text-white">{currentPlanMacros.protein}g</strong></div>
                  <div className="rounded-xl border border-neutral-800 bg-black/35 px-2 py-2"><span className="block text-[9px] uppercase text-neutral-400">Carb</span><strong className="text-sm font-mono text-white">{currentPlanMacros.carbs}g</strong></div>
                  <div className="rounded-xl border border-neutral-800 bg-black/35 px-2 py-2"><span className="block text-[9px] uppercase text-neutral-400">Grasa</span><strong className="text-sm font-mono text-white">{currentPlanMacros.fat}g</strong></div>
                </div>
              </div>
            </div>
          )}

          {scienceNotice && canEditPlans && (
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-2xl p-4 text-[11px] text-amber-100 leading-relaxed">
              <span className="font-bold uppercase tracking-wider text-amber-300 block mb-1">Base científica interna para coach/admin</span>
              {scienceNotice} Los rangos internos usan proteína por kg, grasas como porcentaje calórico, carbohidratos ajustados por demanda energética y progresión de entrenamiento según nivel. Esta información se muestra solo al equipo profesional.
            </div>
          )}

          {scienceNotice && !canEditPlans && (
            <div className="bg-sky-950/20 border border-sky-900/40 rounded-2xl p-4 text-[11px] text-sky-100 leading-relaxed">
              <span className="font-bold uppercase tracking-wider text-sky-300 block mb-1">Tu plan está supervisado</span>
              La dieta y la rutina que ves aquí fueron asignadas por tu entrenador. Si necesitas ajustes por salud, molestias, preferencias o disponibilidad, escríbele por el chat antes de modificar hábitos importantes.
            </div>
          )}

          {canEditPlans && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">Generación selectiva de dieta</span>
                  <span className="text-[11px] text-neutral-400 block mt-1">
                    Marca solo las comidas que quieres cambiar. Las demás se conservan y las nuevas se recalculan para mantenerse cerca del objetivo calórico y de macros.
                  </span>
                  {saveStatus && <span className={`mt-2 block text-[11px] ${/no se|no pudo|corrige/i.test(saveStatus) ? 'text-red-300' : 'text-emerald-400'}`}>{saveStatus}</span>}
                </div>
                <button
                  onClick={handleGenerateAutomaticDiet}
                  disabled={!nutritionTargetApi || nutritionTargetLoading}
                  className="bg-red-600 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500 hover:bg-red-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shrink-0 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> {liveDietPlan.meals.length > 0 ? 'Regenerar comidas seleccionadas' : 'Generar y asignar dieta'}
                </button>
              </div>

              {liveDietPlan.meals.length > 0 && (
                <div className="rounded-xl border border-neutral-800 bg-black/30 p-3 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">
                      Selecciona qué comidas quieres volver a generar
                    </span>
                    <div className="flex gap-2">
                      <button type="button" onClick={selectAllMealsForGeneration} className="text-[10px] px-2.5 py-1 rounded-lg border border-neutral-700 text-neutral-300 hover:border-red-500 hover:text-white transition-colors">
                        Seleccionar todas
                      </button>
                      <button type="button" onClick={clearMealsForGeneration} className="text-[10px] px-2.5 py-1 rounded-lg border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white transition-colors">
                        Quitar selección
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {liveDietPlan.meals.map((meal, index) => {
                      const selected = selectedMealIndexesForGeneration.has(index);
                      return (
                        <button
                          key={`${meal.name}-${index}`}
                          type="button"
                          onClick={() => toggleMealForGeneration(index)}
                          className={`rounded-xl border px-3 py-3 text-left transition-all ${selected ? 'border-red-500 bg-red-950/30 text-white' : 'border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:border-neutral-600'}`}
                        >
                          <span className="block text-xs font-bold">{getMealDisplayLabel(index, meal)}</span>
                          <span className="block text-[10px] mt-1 leading-snug">
                            {selected ? 'Se generará otra opción' : 'Se conserva como está'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {!canEditPlans && liveDietPlan.meals.length === 0 && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-center">
              <span className="text-xs font-bold text-neutral-300 block">Tu dieta aún no ha sido asignada</span>
              <p className="text-[11px] text-neutral-500 mt-1">El entrenador o administrador debe generar o crear tu dieta para que aparezca aquí.</p>
            </div>
          )}

          {canEditPlans && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">Crear dieta manualmente</span>
                <span className="text-[11px] text-neutral-400 block mt-1">Agrega alimentos por comida. Luego pulsa “Guardar y enviar alimentación” para confirmarlo al cliente.</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <input value={manualMealName} onChange={(e) => setManualMealName(e.target.value)} placeholder="Comida" className="md:col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600" />
                <input value={manualFoodName} onChange={(e) => setManualFoodName(e.target.value)} placeholder="Alimento" className="md:col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600" />
                <input type="number" value={manualGrams} onChange={(e) => setManualGrams(Number(e.target.value))} placeholder="Gramos" className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600 font-mono" />
                <select value={manualCategory} onChange={(e) => setManualCategory(e.target.value as DietMealItem['category'])} className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600">
                  <option value="protein">Proteína</option>
                  <option value="carb">Carbohidrato</option>
                  <option value="fat">Grasa</option>
                  <option value="veg">Vegetal</option>
                  <option value="drink">Bebida</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                <input type="number" min="0" step="0.1" value={manualProteinPer100} onChange={(e) => setManualProteinPer100(Number(e.target.value))} placeholder="Proteína/100g" className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600 font-mono" />
                <input type="number" min="0" step="0.1" value={manualCarbsPer100} onChange={(e) => setManualCarbsPer100(Number(e.target.value))} placeholder="Carbs/100g" className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600 font-mono" />
                <input type="number" min="0" step="0.1" value={manualFatPer100} onChange={(e) => setManualFatPer100(Number(e.target.value))} placeholder="Grasa/100g" className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600 font-mono" />
                <input type="number" min="0" step="1" value={manualCalsPer100} onChange={(e) => setManualCalsPer100(Number(e.target.value))} placeholder="Kcal/100g" className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600 font-mono" />
                <button onClick={handleAddManualItem} className="col-span-2 bg-neutral-100 hover:bg-white text-black font-bold text-xs px-3 py-2 rounded-lg transition-colors md:col-span-1">Agregar alimento manual</button>
              </div>
              <p className="text-[10px] text-neutral-500">Se valida que proteína×4 + carbohidratos×4 + grasa×9 sea coherente con las kcal declaradas.</p>
            </div>
          )}

          {canEditPlans && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">Agregar alimento a la base profesional</span>
                <span className="text-[11px] text-neutral-400 block mt-1">Disponible solo para administrador/entrenador. El cliente no ve esta herramienta interna.</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input value={newFoodName} onChange={(e) => setNewFoodName(e.target.value)} placeholder="Nombre del alimento" className="md:col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600" />
                <select value={newFoodCategory} onChange={(e) => setNewFoodCategory(e.target.value as FoodItem['category'])} className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600">
                  <option value="protein">Proteína</option><option value="carb">Carbohidrato</option><option value="fat">Grasa</option><option value="veg">Vegetal</option><option value="fruit">Fruta</option><option value="dairy">Lácteo</option><option value="snack">Snack</option><option value="drink">Bebida</option>
                </select>
                <button onClick={handleCreateFood} className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors">Guardar alimento</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <input type="number" value={newFoodProtein} onChange={(e) => setNewFoodProtein(Number(e.target.value))} placeholder="Proteína/100g" className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600 font-mono" />
                <input type="number" value={newFoodCarbs} onChange={(e) => setNewFoodCarbs(Number(e.target.value))} placeholder="Carbs/100g" className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600 font-mono" />
                <input type="number" value={newFoodFat} onChange={(e) => setNewFoodFat(Number(e.target.value))} placeholder="Grasa/100g" className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600 font-mono" />
                <input type="number" value={newFoodCalories} onChange={(e) => setNewFoodCalories(Number(e.target.value))} placeholder="Kcal/100g" className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600 font-mono" />
                <input type="number" value={newFoodFiber} onChange={(e) => setNewFoodFiber(Number(e.target.value))} placeholder="Fibra/100g" className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600 font-mono" />
              </div>
              {foodAdminStatus && <p className="text-[11px] text-emerald-400">{foodAdminStatus}</p>}
            </div>
          )}

          {canEditPlans && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">Notas clínicas del plan nutricional</span>
                  <span className="text-[11px] text-neutral-400 block mt-1">Edita la instrucción que verá el cliente y guárdala como actualización del plan activo.</span>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteActiveDiet}
                  disabled={liveDietPlan.id.startsWith('empty-') || liveDietPlan.id.startsWith('auto-')}
                  className="bg-neutral-900 hover:bg-red-950/60 disabled:opacity-40 disabled:cursor-not-allowed text-red-300 border border-red-900/50 text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                >
                  Retirar dieta activa
                </button>
              </div>
              <textarea
                value={planNotesDraft}
                onChange={(e) => setPlanNotesDraft(e.target.value)}
                rows={3}
                placeholder="Indicaciones, observaciones o ajustes del profesional responsable..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-600 resize-none"
              />
            </div>
          )}

          {/* DIAGNÓSTICO PROFESIONAL COMPACTO */}
          <details className="group rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-xs">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-400">Plan de alimentación</span>
                <span className="mt-1 block text-sm font-black text-white">Ver criterio profesional</span>
              </div>
              <span className="rounded-full border border-neutral-700 bg-black px-3 py-1 text-[10px] font-bold text-neutral-400 group-open:hidden">Abrir</span>
              <span className="hidden rounded-full border border-emerald-800 bg-emerald-950/40 px-3 py-1 text-[10px] font-bold text-emerald-300 group-open:inline">Ocultar</span>
            </summary>
            <p className="mt-4 rounded-xl border border-neutral-800 bg-black/40 p-3 text-xs leading-relaxed text-neutral-300">
              {liveDietPlan?.specialistDiagnosis}
            </p>
          </details>

          {/* TARJETAS VISUALES DE COMIDAS: texto corto primero, detalles bajo demanda */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Utensils className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Distribución de Porciones por Comida
              </h3>
            </div>

            {substitutionMessage && (
              <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-amber-800/50 bg-amber-950/20 p-3 text-[11px] leading-relaxed text-amber-100">
                <span>{substitutionMessage}</span>
                <button type="button" onClick={() => setSubstitutionMessage('')} className="shrink-0 text-amber-400 hover:text-white" aria-label="Cerrar mensaje">✕</button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveDietPlan?.meals.length > 0 ? liveDietPlan.meals.map((meal, mIndex) => {
                const macros = mealMacros(meal);
                return (
                  <div key={mIndex} className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 shadow-xl shadow-black/20 transition-colors hover:border-neutral-700">
                    <div className="relative border-b border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black p-4">
                      <div className="absolute right-4 top-4 h-10 w-10 rounded-2xl border border-red-900/40 bg-red-600/10" aria-hidden="true" />
                      <span className="rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">Comida {mIndex + 1}</span>
                      <h4 className="mt-3 pr-14 text-lg font-black leading-tight text-white">{meal.name}</h4>
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        <div className="rounded-2xl border border-neutral-800 bg-black/50 p-2 text-center">
                          <span className="block text-[9px] font-black uppercase text-neutral-500">Total comida</span>
                          <span className="text-sm font-black text-white">{macros.cals} kcal</span>
                        </div>
                        <div className="rounded-2xl border border-neutral-800 bg-black/50 p-2 text-center">
                          <span className="block text-[9px] font-black uppercase text-neutral-500">Prot</span>
                          <span className="text-sm font-black text-white">{macros.protein}g</span>
                        </div>
                        <div className="rounded-2xl border border-neutral-800 bg-black/50 p-2 text-center">
                          <span className="block text-[9px] font-black uppercase text-neutral-500">Carb</span>
                          <span className="text-sm font-black text-white">{macros.carbs}g</span>
                        </div>
                        <div className="rounded-2xl border border-neutral-800 bg-black/50 p-2 text-center">
                          <span className="block text-[9px] font-black uppercase text-neutral-500">Grasa</span>
                          <span className="text-sm font-black text-white">{macros.fat}g</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 p-3 sm:p-4">
                      {meal.items.map((item, iIndex) => {
                        const itemMacro = itemMacros(item);
                        const categoryMeta = foodCategoryUi(item.category);
                        return (
                          <div key={iIndex} className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                      <div className="min-w-0">
                                  <span className="block truncate text-sm font-black text-white">{item.currentName}</span>
                                  <span className="mt-0.5 block text-xs font-bold text-neutral-400">{item.amountGrams}g · {categoryMeta.label}</span>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <span className="block text-sm font-black text-white">{itemMacro.cals}</span>
                                <span className="block text-[10px] text-neutral-500">kcal</span>
                              </div>
                            </div>

                            <details className="group mt-3">
                              <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-neutral-800 bg-black/40 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-neutral-300">
                                <span>Ver porción y macros</span>
                                <span className="text-red-300 group-open:hidden">Abrir</span>
                                <span className="hidden text-emerald-300 group-open:inline">Ocultar</span>
                              </summary>
                              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-xl bg-black/40 p-2"><span className="block text-[9px] text-neutral-500">Proteína</span><b className="text-white">{itemMacro.protein}g</b></div>
                                <div className="rounded-xl bg-black/40 p-2"><span className="block text-[9px] text-neutral-500">Carbs</span><b className="text-white">{itemMacro.carbs}g</b></div>
                                <div className="rounded-xl bg-black/40 p-2"><span className="block text-[9px] text-neutral-500">Grasa</span><b className="text-white">{itemMacro.fat}g</b></div>
                              </div>
                              <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">Equivalencia original: {item.originalName}</p>
                            </details>

                            <button
                              type="button"
                              onClick={() => {
                                setSubstitutionMessage('');
                                setSubstitutionSearch('');
                                setSubstitutingItem({ mealIndex: mIndex, itemIndex: iIndex, item });
                              }}
                              className="mt-3 w-full rounded-xl border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-[11px] font-black text-amber-200 transition-colors hover:border-amber-500 hover:bg-amber-900/30"
                            >
                              {canEditPlans ? 'Sustituir alimento' : 'Cambiar por equivalente'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }) : (
                <div className="md:col-span-2 bg-neutral-950 border border-neutral-800 rounded-xl p-10 text-center">
                  <Utensils className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                  <p className="text-sm font-bold text-neutral-300">Aún no hay comidas asignadas</p>
                  <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                    Usa el botón “Generar y asignar dieta” para crear una dieta inicial automática. El entrenador o administrador podrá guardarla y luego ajustar o sustituir alimentos.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* PANEL EXPANDIDO: PLANTILLAS DE RUTINAS COMPLETAS */}
          <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Programas de Entrenamiento Prescritos
                </h3>
              </div>
              <span className="text-[10px] text-neutral-500 font-mono">
                9 rutinas maestras fijas · {professionalRoutines.length} programas adicionales
              </span>
            </div>

            {canEditPlans && (
              <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/10 p-4 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-300">Rutinas maestras de hipertrofia</span>
                    <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-neutral-400">
                      Estructuras fijas para asignar sin buscar ni reemplazar ejercicio por ejercicio. Elige audiencia y nivel, carga el borrador y confirma con Guardar y enviar rutina.
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-800 bg-black/30 px-3 py-1 text-[9px] font-black uppercase text-emerald-200">Estructura protegida</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(['Mujer', 'Hombre', 'General'] as FixedRoutineAudience[]).map((audience) => (
                    <button
                      type="button"
                      key={audience}
                      onClick={() => { setFixedAudienceFilter(audience); setExpandedFixedRoutineIds(new Set()); }}
                      className={`rounded-xl border px-3 py-2 text-[11px] font-black transition-colors ${fixedAudienceFilter === audience ? 'border-emerald-500 bg-emerald-500/20 text-white' : 'border-neutral-800 bg-black/30 text-neutral-400 hover:border-emerald-800 hover:text-white'}`}
                    >
                      {audience}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {fixedRoutinesForAudience.map((template) => {
                    const expanded = expandedFixedRoutineIds.has(template.id);
                    return (
                      <div key={template.id} className="overflow-hidden rounded-xl border border-neutral-800 bg-black/30">
                        <button
                          type="button"
                          onClick={() => toggleFixedRoutine(template.id)}
                          className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-neutral-900/60"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-black text-white">{template.title}</span>
                              <span className="rounded bg-neutral-800 px-2 py-0.5 text-[9px] font-bold text-neutral-300">{template.daysPerWeek} días</span>
                              <span className="rounded bg-emerald-950 px-2 py-0.5 text-[9px] font-bold text-emerald-300">{template.presetCode}</span>
                            </div>
                            <p className="mt-1 line-clamp-1 text-[10px] text-neutral-500">{template.description}</p>
                          </div>
                          {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-emerald-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500" />}
                        </button>

                        {expanded && (
                          <div className="space-y-3 border-t border-neutral-800 p-3">
                            <div className="grid gap-2 md:grid-cols-3">
                              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                                <span className="block text-[9px] font-black uppercase text-neutral-500">Volumen semanal</span>
                                <p className="mt-1 text-[10px] leading-relaxed text-neutral-300">{template.weeklyVolume}</p>
                              </div>
                              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                                <span className="block text-[9px] font-black uppercase text-neutral-500">Intensidad</span>
                                <p className="mt-1 text-[10px] leading-relaxed text-neutral-300">{template.intensityGuide}</p>
                              </div>
                              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                                <span className="block text-[9px] font-black uppercase text-neutral-500">Progresión</span>
                                <p className="mt-1 text-[10px] leading-relaxed text-neutral-300">{template.progressionGuide}</p>
                              </div>
                            </div>

                            <div className="grid gap-2 md:grid-cols-2">
                              {template.days.map((day) => (
                                <details key={`${template.id}-${day.day}`} className="group rounded-xl border border-neutral-800 bg-neutral-950">
                                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2">
                                    <div>
                                      <span className="block text-[11px] font-black text-white">{day.day}</span>
                                      <span className="text-[9px] text-neutral-500">{day.focus}</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-emerald-300">{day.exercises.length} ejercicios</span>
                                  </summary>
                                  <div className="space-y-1 border-t border-neutral-800 px-3 py-2">
                                    {day.exercises.map((exercise) => (
                                      <div key={`${day.day}-${exercise.name}`} className="flex items-start justify-between gap-3 text-[10px]">
                                        <span className="text-neutral-300">{exercise.name}</span>
                                        <span className="shrink-0 font-mono font-bold text-emerald-300">{exercise.sets} × {exercise.reps}</span>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleLoadFixedRoutine(template)}
                              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white transition-colors hover:bg-emerald-500"
                            >
                              Cargar {template.title} para {activeClientObj.name}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {routineStatus && <p className="rounded-xl border border-neutral-800 bg-black/30 p-3 text-[11px] leading-relaxed text-emerald-300">{routineStatus}</p>}
              </div>
            )}

            {canEditPlans && (
              <details className="group rounded-xl border border-red-900/40 bg-red-950/10">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                  <div>
                    <span className="block text-xs font-black uppercase tracking-wider text-white">Generador automático avanzado</span>
                    <span className="mt-1 block text-[10px] text-neutral-500">Abrir solo cuando una plantilla fija no sea adecuada.</span>
                  </div>
                  <span className="text-[10px] font-black uppercase text-red-300 group-open:hidden">Abrir</span>
                  <span className="hidden text-[10px] font-black uppercase text-emerald-300 group-open:inline">Ocultar</span>
                </summary>
                <div className="border-t border-red-900/30 p-4 space-y-4">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">Generador de rutina con máquinas Imperial</span>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Solo entrenador/admin puede generar rutinas. El cliente únicamente ve la rutina asignada.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase mb-1">Objetivo</label>
                    <select value={trainingGoal} onChange={(e) => setTrainingGoal(e.target.value as TrainingGoal)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600">
                      <option value="hipertrofia">Hipertrofia</option>
                      <option value="fuerza">Fuerza</option>
                      <option value="resistencia">Resistencia</option>
                      <option value="salud">Salud sostenible</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase mb-1">Nivel</label>
                    <select value={trainingLevel} onChange={(e) => setTrainingLevel(e.target.value as TrainingLevel)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600">
                      <option value="Principiante">Principiante</option>
                      <option value="Intermedio">Intermedio</option>
                      <option value="Avanzado">Avanzado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase mb-1">División</label>
                    <select value={trainingSplit} onChange={(e) => setTrainingSplit(e.target.value as TrainingSplit)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600">
                      <option value="auto">Automática según nivel</option>
                      {TRAINING_MODE_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase mb-1">Técnicas</label>
                    <select value={trainingIntensityMode} onChange={(e) => setTrainingIntensityMode(e.target.value as TrainingIntensityMode)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600">
                      {TRAINING_INTENSITY_MODE_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase mb-1">Fuente</label>
                    <select value={routineExerciseSource} onChange={(e) => setRoutineExerciseSource(e.target.value as ExerciseSourceFilter)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600">
                      <option value="all">Todas ({exerciseSourceCounts.all})</option>
                      <option value="imperial">Imperial Fitness ({exerciseSourceCounts.imperial})</option>
                      <option value="open">Base abierta ({exerciseSourceCounts.open})</option>
                    </select>
                  </div>
                  <button onClick={handleGenerateRoutine} className="self-end bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors">
                    Generar rutina asignada
                  </button>
                </div>
                <div className="rounded-xl border border-sky-900/30 bg-sky-950/10 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] bg-sky-500/20 border border-sky-700/40 text-sky-200 rounded-full px-2 py-1 font-black uppercase">Catálogo activo</span>
                    <span className="text-xs font-black text-white">{routineExerciseSourceLabel}</span>
                    <span className="text-[10px] text-neutral-400">{routineGenerationCatalog.length} ejercicios profesionales verificados</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
                    {exerciseCatalogStatus} El generador automático solo admite ejercicios de gimnasio para hipertrofia con músculo principal confirmado y equipo de máquina, polea, Smith o mancuernas. Excluye cardio, movilidad, rehabilitación, calistenia y ejercicios infantiles o para adultos mayores.
                  </p>
                </div>
                {selectedModePreset && (
                  <div className="rounded-xl border border-red-900/40 bg-black/30 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] bg-red-600/20 border border-red-700/40 text-red-100 rounded-full px-2 py-1 font-black uppercase">Modo premium</span>
                      <span className="text-xs font-black text-white">{selectedModePreset.label}</span>
                      <span className="text-[10px] text-neutral-400">{selectedModePreset.days} días · {selectedModePreset.recommendedLevel} · {selectedModePreset.purpose}</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed">{selectedModePreset.premiumDescription}</p>
                  </div>
                )}
                {canEditPlans && (
                  <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] bg-amber-500/20 border border-amber-700/40 text-amber-200 rounded-full px-2 py-1 font-black uppercase">Intensidad aplicada</span>
                      <span className="text-xs font-black text-white">{TRAINING_INTENSITY_MODE_PRESETS.find(item => item.id === trainingIntensityMode)?.label}</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
                      {TRAINING_INTENSITY_MODE_PRESETS.find(item => item.id === trainingIntensityMode)?.description} La app limita estas técnicas por nivel y las aplica solo en ejercicios compatibles para evitar fatiga excesiva o mala técnica.
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <label className="block text-[10px] text-neutral-500 uppercase">Días de entrenamiento</label>
                    <button
                      type="button"
                      onClick={() => setUseCustomWeeklySplit(prev => !prev)}
                      className={`text-[10px] px-3 py-1.5 rounded-lg border font-black uppercase transition-colors ${useCustomWeeklySplit ? 'bg-sky-600 border-sky-500 text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-sky-500'}`}
                    >
                      {useCustomWeeklySplit ? 'Semana personalizada activa' : 'Personalizar músculos por día'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TRAINING_DAYS.map(day => (
                      <button
                        key={day}
                        onClick={() => toggleTrainingDay(day)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold ${selectedTrainingDays.includes(day) ? 'bg-red-600 border-red-600 text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-400'}`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {useCustomWeeklySplit && (
                  <div className="rounded-2xl border border-sky-900/40 bg-sky-950/10 p-4 space-y-4">
                    <div>
                      <span className="text-xs font-black text-white uppercase tracking-wider block">Planificación semanal por grupos musculares</span>
                      <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                        Escoge exactamente qué se entrena cada día. Puedes combinar más de un grupo muscular, por ejemplo pecho + tríceps, espalda + bíceps, glúteo + femoral o pierna + abdomen. El generador conserva la fuente de ejercicios, limitaciones y objetivo.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {selectedTrainingDays.length ? TRAINING_DAYS.filter(day => selectedTrainingDays.includes(day)).map(day => {
                        const selectedTargets = customWeeklyPlanDraft[day] || [];
                        return (
                          <div key={day} className="rounded-xl border border-neutral-800 bg-black/30 p-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                              <div>
                                <span className="text-sm font-black text-white">{day}</span>
                                <p className="text-[10px] text-neutral-500">{selectedTargets.length ? `${selectedTargets.length} grupo(s): ${selectedTargets.map(target => ROUTINE_MUSCLE_TARGETS.find(option => option.id === target)?.shortLabel || target).join(' + ')}` : 'Selecciona uno o más músculos para este día'}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setCustomWeeklyPlanDraft(prev => ({ ...prev, [day]: [] }))}
                                className="text-[10px] rounded-lg border border-neutral-700 px-2 py-1 text-neutral-400 hover:border-red-500 hover:text-white"
                              >
                                Limpiar día
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {ROUTINE_MUSCLE_TARGETS.map(target => {
                                const active = selectedTargets.includes(target.id);
                                return (
                                  <button
                                    type="button"
                                    key={`${day}-${target.id}`}
                                    onClick={() => toggleCustomMuscleTarget(day, target.id)}
                                    title={target.description}
                                    className={`rounded-xl border px-3 py-2 text-[10px] font-black transition-colors ${active ? 'border-sky-400 bg-sky-500/20 text-sky-100' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-sky-700 hover:text-white'}`}
                                  >
                                    {target.shortLabel}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 text-xs text-neutral-400">Selecciona al menos un día de entrenamiento.</div>
                      )}
                    </div>
                    <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/10 p-3">
                      <span className="text-[10px] bg-emerald-500/20 border border-emerald-700/40 text-emerald-200 rounded-full px-2 py-1 font-black uppercase">Cargas por objetivo</span>
                      <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
                        La rutina asigna series, repeticiones, descansos, RIR y guía de carga según objetivo: fuerza usa cargas altas y descansos largos; hipertrofia usa volumen efectivo y 1-3 RIR; resistencia usa más repeticiones y descansos cortos; salud usa esfuerzo moderado y técnica segura.
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-neutral-800 bg-black/30 p-3">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-2">Máquinas consideradas</span>
                  <div className="flex flex-wrap gap-1.5">
                    {IMPERIAL_EQUIPMENT.slice(0, 14).map(machine => <span key={machine} className="text-[9px] text-neutral-400 bg-neutral-900 border border-neutral-800 rounded px-2 py-0.5">{machine}</span>)}
                    <span className="text-[9px] text-red-400 bg-red-950/30 border border-red-900/40 rounded px-2 py-0.5">+{Math.max(0, IMPERIAL_EQUIPMENT.length - 14)} más</span>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                  <button onClick={handleCreateRoutineTemplate} className="bg-neutral-100 hover:bg-white text-black font-bold text-xs px-3 py-2 rounded-lg transition-colors">
                    Guardar como plantilla manual
                  </button>
                  {templateStatus && <p className="text-[11px] text-emerald-400 self-center">{templateStatus}</p>}
                </div>
                {routineStatus && <p className="text-[11px] text-emerald-400">{routineStatus}</p>}
                </div>
              </details>
            )}

            <ImperialCarePanel
              currentUser={currentUser}
              client={activeClientObj}
              onLimitationsChange={setActiveLimitations}
              onLoadStateChange={setLimitationsLoadState}
            />

            <NutritionSafetyReviewCard client={activeClientObj} />
            <TrainingVolumeAuditPanel client={activeClientObj} routine={defaultRoutine} />

            {/* Rutina asignada actualmente al cliente */}
            {defaultRoutine && (
              <div className="bg-red-950/20 p-4 sm:p-5 rounded-2xl border border-red-900/40 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-red-400 font-black uppercase tracking-wider">Rutina Activa Asignada</span>
                      {defaultRoutine.structureLocked && (
                        <>
                          <span className="rounded-full border border-emerald-800 bg-emerald-950/50 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-300">Plantilla fija protegida</span>
                          {canEditPlans && (
                            <button type="button" onClick={handleUnlockFixedRoutineStructure} className="rounded-full border border-neutral-700 px-2 py-0.5 text-[9px] font-bold text-neutral-400 hover:border-amber-600 hover:text-amber-200">
                              Desbloquear ejercicios
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {canEditPlans ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          value={routineTitleDraft}
                          onChange={(e) => setRoutineTitleDraft(e.target.value)}
                          className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
                          placeholder="Título de rutina"
                        />
                        <input
                          value={routineObjectiveDraft}
                          onChange={(e) => setRoutineObjectiveDraft(e.target.value)}
                          className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
                          placeholder="Objetivo"
                        />
                      </div>
                    ) : (
                      <>
                        <span className="text-lg sm:text-xl font-black text-white block leading-tight">{defaultRoutine.title}</span>
                        <p className="text-sm text-neutral-300 mt-1 leading-relaxed">{defaultRoutine.objective}</p>
                      </>
                    )}
                  </div>
                  {canEditPlans && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleUpdateActiveRoutine}
                        disabled={isPublishing || !hasPublishableRoutine}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3 py-2 rounded-lg transition-colors disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
                      >
                        {isPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Guardar y enviar rutina
                      </button>
                      <button
                        type="button"
                        onClick={handleDeactivateActiveRoutine}
                        className="bg-neutral-900 hover:bg-red-950/70 text-red-300 border border-red-900/50 font-bold text-xs px-3 py-2 rounded-lg transition-colors"
                      >
                        Retirar
                      </button>
                    </div>
                  )}
                </div>

                {canEditPlans && (
                  <textarea
                    value={routineAdviceDraft}
                    onChange={(e) => setRoutineAdviceDraft(e.target.value)}
                    rows={3}
                    placeholder="Directriz visible para el cliente: técnica, progresión, descansos, advertencias..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-600 resize-none"
                  />
                )}

                {canEditPlans && (
                  <div className="rounded-2xl border border-amber-900/40 bg-amber-950/10 p-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider block">Cambio inteligente de ejercicios</span>
                        <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                          Marca solo los ejercicios que quieres cambiar. Los demás se conservan para proteger la adherencia y la progresión. El reemplazo respeta grupo muscular, patrón de movimiento, nivel, equipo y limitaciones del cliente.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={selectAllRoutineExercisesForGeneration} className="text-[10px] px-2.5 py-1 rounded-lg border border-neutral-700 text-neutral-300 hover:border-amber-500 hover:text-white transition-colors">
                          Seleccionar todos
                        </button>
                        <button type="button" onClick={clearRoutineExercisesForGeneration} className="text-[10px] px-2.5 py-1 rounded-lg border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white transition-colors">
                          Quitar selección
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <select value={routineRegenerationReason} onChange={(e) => setRoutineRegenerationReason(e.target.value as typeof routineRegenerationReason)} className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-600 md:col-span-2">
                        <option value="variation">Motivo: variación controlada</option>
                        <option value="no_gusta">Motivo: no le gusta al cliente</option>
                        <option value="molestia">Motivo: genera molestia</option>
                        <option value="sin_maquina">Motivo: máquina/equipo no disponible</option>
                        <option value="muy_dificil">Motivo: está muy difícil</option>
                        <option value="muy_facil">Motivo: está muy fácil</option>
                      </select>
                      <button type="button" disabled={Boolean(defaultRoutine?.structureLocked)} onClick={handleRegenerateSelectedRoutineExercises} className="bg-amber-500 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40 text-black font-black text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5" /> Cambiar seleccionados
                      </button>
                    </div>
                    <p className="text-[10px] text-neutral-500 leading-relaxed">
                      Si un ejercicio tiene historial de carga, la app lo marca como progresión protegida. Puedes cambiarlo, pero se recomienda hacerlo por un equivalente del mismo grupo muscular para no perder seguimiento.
                    </p>
                  </div>
                )}

                <div className="mt-3 space-y-4">
                  <div className="rounded-3xl border border-neutral-800/80 bg-neutral-950/80 p-3 sm:p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400">Calendario de rutina</span>
                        <p className="text-xs text-neutral-400">Elige el día y revisa ejercicios visuales. Toca una imagen para abrir la técnica completa.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] font-bold text-neutral-300">
                        <span className="inline-flex items-center gap-1 rounded-full border border-neutral-800 bg-black/40 px-2.5 py-1"><CalendarDays className="h-3.5 w-3.5 text-red-400" /> {(defaultRoutine.days || []).length} días</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-neutral-800 bg-black/40 px-2.5 py-1"><ListChecks className="h-3.5 w-3.5 text-red-400" /> {(defaultRoutine.days || []).reduce((total, item) => total + (item.exercises?.length || 0), 0)} ejercicios</span>
                      </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {(defaultRoutine.days || []).map((dayObj, dIdx) => {
                        const isActiveDay = dIdx === selectedRoutineDayIndex;
                        return (
                          <button
                            key={`${dayObj.day}-${dIdx}`}
                            type="button"
                            onClick={() => setSelectedRoutineDayIndex(dIdx)}
                            className={`min-w-[128px] rounded-2xl border px-3 py-2 text-left transition-all ${isActiveDay ? 'border-red-600 bg-red-600 text-white shadow-lg shadow-red-950/30' : 'border-neutral-800 bg-black/40 text-neutral-300 hover:border-red-900/70 hover:bg-red-950/20'}`}
                          >
                            <span className="block text-[10px] font-black uppercase tracking-widest opacity-80">Día {dIdx + 1}</span>
                            <span className="block truncate text-sm font-black leading-tight">{dayObj.day}</span>
                            <span className="mt-1 block truncate text-[10px] opacity-80">{dayObj.exercises?.length || 0} ejercicios</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {canEditPlans && (defaultRoutine.days || [])[selectedRoutineDayIndex] && (
                    <div className="rounded-3xl border border-sky-900/50 bg-sky-950/10 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-sky-500/15 p-2 text-sky-300"><Search className="h-5 w-5" /></div>
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-wide text-white">Agregar ejercicio manualmente</h3>
                          <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">Busca por nombre, músculo o equipo y agrégalo solamente al día seleccionado. No se regenerará el resto de la rutina.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-10">
                        <div className="relative md:col-span-4">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                          <input
                            value={manualExerciseSearch}
                            onChange={(event) => setManualExerciseSearch(event.target.value)}
                            placeholder="Ej.: press inclinado, femoral, polea…"
                            className="w-full rounded-xl border border-neutral-800 bg-black/50 py-2 pl-9 pr-3 text-xs text-white focus:border-sky-500 focus:outline-none"
                          />
                        </div>
                        <select value={manualExercisePosition} onChange={(event) => setManualExercisePosition(Number(event.target.value))} aria-label="Posición del ejercicio" className="rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white focus:border-sky-500 focus:outline-none">
                          {Array.from({ length: ((defaultRoutine.days || [])[selectedRoutineDayIndex]?.exercises.length || 0) + 1 }, (_, index) => <option key={index + 1} value={index + 1}>Posición {index + 1}</option>)}
                        </select>
                        <select value={manualExerciseBlock} onChange={(event) => setManualExerciseBlock(event.target.value)} aria-label="Módulo muscular" className="rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white focus:border-sky-500 focus:outline-none md:col-span-2">
                          <option value="Auto">Módulo automático</option>
                          {ROUTINE_BLOCK_OPTIONS.map((block) => <option key={block} value={block}>{block}</option>)}
                        </select>
                        <input type="number" min="1" max="10" value={manualExerciseSets} onChange={(event) => setManualExerciseSets(Number(event.target.value))} aria-label="Series" placeholder="Series" className="rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white focus:border-sky-500 focus:outline-none" />
                        <input value={manualExerciseReps} onChange={(event) => setManualExerciseReps(event.target.value)} aria-label="Repeticiones" placeholder="8-12 reps" className="rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white focus:border-sky-500 focus:outline-none" />
                        <input value={manualExerciseRest} onChange={(event) => setManualExerciseRest(event.target.value)} aria-label="Descanso" placeholder="60-90s" className="rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white focus:border-sky-500 focus:outline-none" />
                      </div>
                      {manualExerciseSearch.trim().length > 0 && manualExerciseSearch.trim().length < 2 && <p className="text-[11px] text-neutral-500">Escribe al menos dos caracteres.</p>}
                      {manualExerciseSearch.trim().length >= 2 && (
                        <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                          {manualExerciseResults.length > 0 ? manualExerciseResults.map((exercise) => (
                            <div key={exercise.id} className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-black/45 p-3">
                              <ExerciseImage
                                name={exercise.name}
                                imageUrl={exercise.imageUrl}
                                imageStartUrl={exercise.imageStartUrl}
                                imageEndUrl={exercise.imageEndUrl}
                                alternateImageUrls={exercise.alternateImageUrls}
                                animationUrl={exercise.animationUrl}
                                videoUrl={exercise.videoUrl}
                                mediaType={exercise.mediaType}
                                primaryMuscle={exercise.primaryMuscle}
                                muscleGroups={exercise.muscleGroups}
                                equipment={exercise.equipment}
                                coachingNotes={exercise.coachingNotes}
                                compact
                                className="shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="block text-xs font-black text-white">{exercise.name}</span>
                                <span className="mt-1 block text-[10px] text-neutral-400">{exercise.primaryMuscle} · {exercise.equipment}</span>
                                <span className="mt-1 block text-[9px] font-bold uppercase tracking-wide text-sky-300">{sourceLabelForExercise(exercise)} · toca la imagen para ampliar</span>
                              </div>
                              <button type="button" disabled={Boolean(defaultRoutine?.structureLocked)} onClick={() => handleAddExerciseManually(exercise)} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-sky-500 px-3 py-2 text-[10px] font-black text-black transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40">
                                <Plus className="h-3.5 w-3.5" /> Agregar
                              </button>
                            </div>
                          )) : <p className="md:col-span-2 rounded-2xl border border-neutral-800 bg-black/35 p-3 text-[11px] text-neutral-400">No se encontraron ejercicios con esa búsqueda y los filtros de seguridad actuales.</p>}
                        </div>
                      )}
                    </div>
                  )}

                  {(defaultRoutine.days || [])[selectedRoutineDayIndex] && (() => {
                    const dayObj = (defaultRoutine.days || [])[selectedRoutineDayIndex];
                    return (
                      <section className="rounded-3xl border border-red-900/40 bg-gradient-to-b from-red-950/30 to-black/40 p-3 sm:p-4">
                        <div className="mb-4 rounded-3xl border border-red-900/40 bg-black/50 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                                <CalendarDays className="h-3.5 w-3.5" /> Día {selectedRoutineDayIndex + 1} de {(defaultRoutine.days || []).length}
                              </span>
                              <h3 className="mt-3 text-2xl font-black uppercase leading-none text-white sm:text-3xl">{dayObj.day}</h3>
                              <p className="mt-2 text-sm font-bold text-red-100 sm:text-base">{dayObj.focus}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-center sm:min-w-[220px]">
                              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 px-3 py-2">
                                <span className="block text-xl font-black text-white">{dayObj.exercises?.length || 0}</span>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Ejercicios</span>
                              </div>
                              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 px-3 py-2">
                                <span className="block text-xl font-black text-white">{Math.max(25, (dayObj.exercises?.length || 0) * 7)}</span>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Min aprox.</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {!dayObj.exercises.some((exercise) => inferRoutineBlock({ ...exercise, primaryMuscle: catalogForExercise(exercise)?.primaryMuscle }) === 'Calentamiento') && (
                          <div className="mb-4 rounded-3xl border border-emerald-900/50 bg-emerald-950/10 p-4">
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Módulo 1</span>
                                <h4 className="text-lg font-black text-white">Calentamiento</h4>
                              </div>
                              <span className="rounded-full border border-emerald-800/60 bg-black/30 px-2.5 py-1 text-[10px] font-bold text-emerald-200">Preparación recomendada</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                              {buildWarmupExercises(dayObj.focus).map((warmup, index) => (
                                <div key={warmup.name} className="rounded-2xl border border-neutral-800 bg-black/35 p-3">
                                  <span className="text-[10px] font-black text-emerald-300">{index + 1}. {warmup.name}</span>
                                  <p className="mt-1 text-xs font-bold text-white">{warmup.sets} serie · {warmup.reps}</p>
                                  <p className="mt-1 text-[10px] leading-relaxed text-neutral-400">{warmup.notes}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                          {(dayObj.exercises || []).map((ex, exIdx) => {
                            const safeReps = String(ex.reps || '10-12');
                            const selectionKey = routineExerciseKey(selectedRoutineDayIndex, exIdx);
                            const selectedForChange = selectedRoutineExerciseKeys.has(selectionKey);
                            const protectedProgress = exerciseHasProgressSignal(ex);
                            const catalogMeta = catalogForExercise(ex);
                            const displayName = displayRoutineExerciseName(ex, catalogMeta);
                            const currentBlock = inferRoutineBlock({ ...ex, primaryMuscle: catalogMeta?.primaryMuscle, movement: catalogMeta?.movement });
                            const logKey = workoutLogKey(selectedRoutineDayIndex, exIdx);
                            const logDraft = workoutLogDrafts[logKey] || { weightKg: '', reps: '', setNumber: '1', rir: '', notes: '' };
                            const recentExerciseLogs = workoutHistory
                              .filter((entry) => entry.exercise_name.trim().toLowerCase() === displayName.trim().toLowerCase())
                              .slice(0, 3);
                            const previousExercise = dayObj.exercises[exIdx - 1];
                            const previousMeta = previousExercise ? catalogForExercise(previousExercise) : undefined;
                            const previousBlock = previousExercise ? inferRoutineBlock({ ...previousExercise, primaryMuscle: previousMeta?.primaryMuscle, movement: previousMeta?.movement }) : '';
                            const startsModule = exIdx === 0 || currentBlock !== previousBlock;
                            const moduleNumber = dayObj.exercises.slice(0, exIdx + 1).reduce((count, item, index, items) => {
                              const itemMeta = catalogForExercise(item);
                              const itemBlock = inferRoutineBlock({ ...item, primaryMuscle: itemMeta?.primaryMuscle, movement: itemMeta?.movement });
                              if (index === 0) return 1;
                              const priorMeta = catalogForExercise(items[index - 1]);
                              const priorBlock = inferRoutineBlock({ ...items[index - 1], primaryMuscle: priorMeta?.primaryMuscle, movement: priorMeta?.movement });
                              return count + (itemBlock !== priorBlock ? 1 : 0);
                            }, 0);
                            return (
                              <React.Fragment key={`${ex.exerciseId || ex.name}-${exIdx}`}>
                                {startsModule && (
                                  <div className="xl:col-span-2 mt-1 rounded-2xl border border-red-900/40 bg-red-950/15 px-4 py-3">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-red-400">Módulo {moduleNumber}</span>
                                    <h4 className="text-base font-black text-white">{currentBlock}</h4>
                                  </div>
                                )}
                              <article className={`overflow-hidden rounded-3xl border bg-neutral-950/90 shadow-xl shadow-black/20 transition-all ${selectedForChange ? 'border-amber-500/70 ring-1 ring-amber-500/40' : 'border-neutral-800/80'}`}>
                                <div className="relative">
                                  <ExerciseImage
                                    name={displayName}
                                    imageUrl={catalogMeta?.imageUrl || ex.imageUrl}
                                    imageStartUrl={catalogMeta?.imageStartUrl}
                                    imageEndUrl={catalogMeta?.imageEndUrl}
                                    alternateImageUrls={catalogMeta?.alternateImageUrls}
                                    animationUrl={catalogMeta?.animationUrl}
                                    videoUrl={catalogMeta?.videoUrl}
                                    mediaType={catalogMeta?.mediaType}
                                    mediaSource={catalogMeta?.mediaSource}
                                    mediaLicense={catalogMeta?.mediaLicense}
                                    attribution={catalogMeta?.attribution}
                                    mediaNotes={catalogMeta?.mediaNotes}
                                    primaryMuscle={catalogMeta?.primaryMuscle}
                                    muscleGroups={catalogMeta?.muscleGroups || ex.muscleGroups}
                                    equipment={catalogMeta?.equipment || ex.equipment}
                                    coachingNotes={catalogMeta?.coachingNotes || ex.notes}
                                    className="h-48 rounded-none border-0 sm:h-56"
                                  />
                                  <span className="absolute left-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white shadow-lg">{exIdx + 1}</span>
                                  <span className="absolute right-3 top-3 rounded-full border border-black/30 bg-black/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-100">{sourceLabelForExercise(catalogMeta)}</span>
                                </div>
                                <div className="space-y-3 p-4">
                                  <div>
                                    <h4 className="text-lg font-black leading-tight text-white sm:text-xl">{displayName}</h4>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {catalogMeta?.primaryMuscle && <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-[10px] font-bold text-neutral-300">{catalogMeta.primaryMuscle}</span>}
                                      {(catalogMeta?.equipment || ex.equipment) && <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-[10px] font-bold text-neutral-300">{catalogMeta?.equipment || ex.equipment}</span>}
                                      {protectedProgress && <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[10px] font-black text-amber-300">Progresión protegida</span>}
                                      {ex.prescribedLoad && <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[10px] font-black text-sky-200">Carga: {ex.prescribedLoad}</span>}
                                      {ex.targetRir && <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-[10px] font-black text-violet-200">Objetivo: RIR {ex.targetRir}</span>}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="rounded-2xl border border-neutral-800 bg-black/40 p-2 text-center">
                                      <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-500">Series</span>
                                      <span className="text-lg font-black text-white">{ex.sets || 3}</span>
                                    </div>
                                    <div className="rounded-2xl border border-neutral-800 bg-black/40 p-2 text-center">
                                      <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-500">Reps</span>
                                      <span className="text-lg font-black text-white">{safeReps.split(' ')[0]}</span>
                                    </div>
                                    <div className="rounded-2xl border border-neutral-800 bg-black/40 p-2 text-center">
                                      <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-500">Descanso</span>
                                      <span className="text-sm font-black text-white">{ex.rest || '60-90s'}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-neutral-800 bg-black/40 px-2.5 py-1 text-[10px] font-bold text-neutral-300"><Target className="h-3.5 w-3.5 text-red-400" /> Toca la imagen para técnica</span>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-neutral-800 bg-black/40 px-2.5 py-1 text-[10px] font-bold text-neutral-300"><Timer className="h-3.5 w-3.5 text-red-400" /> Controla el rango</span>
                                  </div>
                                  {(ex.notes || ex.intensityTechnique) && (
                                    <details className="rounded-2xl border border-neutral-800 bg-black/40 p-3">
                                      <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-red-300">Ver indicaciones del entrenador</summary>
                                      <div className="mt-3 space-y-3">
                                        {ex.intensityTechnique && (
                                          <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-3">
                                            <span className="text-[10px] font-black uppercase tracking-wide text-red-200">{ex.intensityTechnique.label} · {ex.intensityTechnique.category}</span>
                                            <p className="mt-1 text-xs leading-relaxed text-neutral-300">{ex.intensityTechnique.execution}</p>
                                            <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{ex.intensityTechnique.caution}</p>
                                          </div>
                                        )}
                                        {ex.notes && <p className="text-xs leading-relaxed text-neutral-300">{ex.notes}</p>}
                                      </div>
                                    </details>
                                  )}
                                  <details className="rounded-2xl border border-sky-900/50 bg-sky-950/10 p-3">
                                    <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-sky-300">Registrar ejercicio realizado</summary>
                                    <div className="mt-3 space-y-2">
                                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        <label className="text-[10px] font-bold uppercase text-neutral-500">Peso (kg)
                                          <input type="number" min="0" step="0.5" value={logDraft.weightKg} onChange={(event) => updateWorkoutLogDraft(logKey, 'weightKg', event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white outline-none focus:border-sky-500" />
                                        </label>
                                        <label className="text-[10px] font-bold uppercase text-neutral-500">Repeticiones
                                          <input type="number" min="1" value={logDraft.reps} onChange={(event) => updateWorkoutLogDraft(logKey, 'reps', event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white outline-none focus:border-sky-500" />
                                        </label>
                                        <label className="text-[10px] font-bold uppercase text-neutral-500">Serie N.º
                                          <input type="number" min="1" value={logDraft.setNumber} onChange={(event) => updateWorkoutLogDraft(logKey, 'setNumber', event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white outline-none focus:border-sky-500" />
                                        </label>
                                        <label className="text-[10px] font-bold uppercase text-neutral-500">RIR
                                          <input type="number" min="0" max="10" value={logDraft.rir} onChange={(event) => updateWorkoutLogDraft(logKey, 'rir', event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white outline-none focus:border-sky-500" />
                                        </label>
                                      </div>
                                      <input value={logDraft.notes} onChange={(event) => updateWorkoutLogDraft(logKey, 'notes', event.target.value)} placeholder="Nota opcional: técnica, molestia, esfuerzo..." className="w-full rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white outline-none focus:border-sky-500" />
                                      <button type="button" disabled={savingWorkoutLogKey === logKey} onClick={() => void saveWorkoutExerciseLog(logKey, displayName)} className="w-full rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-500 disabled:opacity-50">
                                        {savingWorkoutLogKey === logKey ? 'Guardando registro...' : 'Guardar serie realizada'}
                                      </button>
                                      {workoutLogStatus[logKey] && <p className="text-[10px] leading-relaxed text-sky-100">{workoutLogStatus[logKey]}</p>}
                                      {recentExerciseLogs.length > 0 && (
                                        <div className="rounded-xl border border-neutral-800 bg-black/35 p-2">
                                          <p className="text-[9px] font-black uppercase tracking-wider text-neutral-500">Últimos registros guardados</p>
                                          <div className="mt-1 space-y-1">
                                            {recentExerciseLogs.map((entry) => (
                                              <p key={entry.id} className="text-[10px] text-neutral-300">
                                                {new Date(entry.created_at).toLocaleDateString('es-CO')} · Serie {entry.set_number}: {entry.weight_kg} kg × {entry.reps} reps{entry.rir !== null && entry.rir !== undefined ? ` · RIR ${entry.rir}` : ''}
                                              </p>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </details>
                                  {canEditPlans && (
                                    <div className="space-y-2">
                                      <details className="rounded-2xl border border-sky-900/50 bg-sky-950/10 p-3">
                                        <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-sky-300">Ajustar carga e intensidad</summary>
                                        <form
                                          key={`${defaultRoutine.id}-${selectedRoutineDayIndex}-${exIdx}-${ex.sets}-${ex.reps}-${ex.rest}-${ex.prescribedLoad || ''}-${ex.targetRir || ''}`}
                                          className="mt-3 space-y-3"
                                          onSubmit={(event) => {
                                            event.preventDefault();
                                            void handleUpdateRoutineExercisePrescription(selectedRoutineDayIndex, exIdx, event.currentTarget);
                                          }}
                                        >
                                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            <label className="text-[10px] font-bold uppercase text-neutral-500">Series
                                              <input name="sets" type="number" min="1" max="10" defaultValue={ex.sets || 3} className="mt-1 w-full rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white outline-none focus:border-sky-500" />
                                            </label>
                                            <label className="text-[10px] font-bold uppercase text-neutral-500">Repeticiones
                                              <input name="reps" defaultValue={safeReps} placeholder="8-12" className="mt-1 w-full rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white outline-none focus:border-sky-500" />
                                            </label>
                                            <label className="text-[10px] font-bold uppercase text-neutral-500">Descanso
                                              <input name="rest" defaultValue={ex.rest || '60-90s'} placeholder="90s" className="mt-1 w-full rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white outline-none focus:border-sky-500" />
                                            </label>
                                            <label className="text-[10px] font-bold uppercase text-neutral-500">Carga objetivo
                                              <input name="prescribedLoad" defaultValue={ex.prescribedLoad || ''} placeholder="Ej. 40 kg o +2,5%" className="mt-1 w-full rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white outline-none focus:border-sky-500" />
                                            </label>
                                            <label className="text-[10px] font-bold uppercase text-neutral-500">RIR objetivo
                                              <input name="targetRir" defaultValue={ex.targetRir || ''} placeholder="Ej. 2-1" className="mt-1 w-full rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs text-white outline-none focus:border-sky-500" />
                                            </label>
                                          </div>
                                          <label className="block text-[10px] font-bold uppercase text-neutral-500">Indicaciones
                                            <textarea name="notes" defaultValue={ex.notes || ''} rows={3} className="mt-1 w-full rounded-xl border border-neutral-800 bg-black/50 p-2 text-xs normal-case text-white outline-none focus:border-sky-500" />
                                          </label>
                                          <button type="submit" className="w-full rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-500">Guardar ajuste de prescripción</button>
                                          <p className="text-[10px] leading-relaxed text-neutral-500">Este ajuste no desbloquea ni cambia los ejercicios de la plantilla fija.</p>
                                        </form>
                                      </details>
                                      <select
                                        value={currentBlock}
                                        onChange={(event) => void handleChangeRoutineExerciseBlock(selectedRoutineDayIndex, exIdx, event.target.value)}
                                        aria-label={`Módulo de ${displayName}`}
                                        className="w-full rounded-xl border border-neutral-800 bg-black/45 p-2 text-xs font-bold text-white focus:border-red-600 focus:outline-none"
                                      >
                                        {ROUTINE_BLOCK_OPTIONS.map((block) => <option key={block} value={block}>{block}</option>)}
                                      </select>
                                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleRoutineExerciseForGeneration(selectedRoutineDayIndex, exIdx)}
                                        className={`rounded-2xl border px-3 py-2 text-xs font-black transition-all ${selectedForChange ? 'border-amber-500 bg-amber-500 text-black' : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-amber-600 hover:text-white'}`}
                                      >
                                        #{exIdx + 1} · {selectedForChange ? 'Se cambiará' : 'Mantener / cambiar'}
                                      </button>
                                      <button type="button" disabled={Boolean(defaultRoutine.structureLocked) || exIdx === 0} onClick={() => handleMoveRoutineExercise(selectedRoutineDayIndex, exIdx, -1)} aria-label={`Subir ${displayName}`} className="inline-flex items-center justify-center rounded-2xl border border-neutral-700 bg-neutral-900 px-3 text-neutral-200 transition-colors hover:border-sky-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
                                        <ArrowUp className="h-4 w-4" />
                                      </button>
                                      <button type="button" disabled={Boolean(defaultRoutine.structureLocked) || exIdx === dayObj.exercises.length - 1} onClick={() => handleMoveRoutineExercise(selectedRoutineDayIndex, exIdx, 1)} aria-label={`Bajar ${displayName}`} className="inline-flex items-center justify-center rounded-2xl border border-neutral-700 bg-neutral-900 px-3 text-neutral-200 transition-colors hover:border-sky-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
                                        <ArrowDown className="h-4 w-4" />
                                      </button>
                                      <button type="button" disabled={Boolean(defaultRoutine.structureLocked)} onClick={() => handleRemoveRoutineExercise(selectedRoutineDayIndex, exIdx)} aria-label={`Eliminar ${displayName}`} className="inline-flex items-center justify-center rounded-2xl border border-red-900/60 bg-red-950/20 px-3 text-red-300 transition-colors hover:border-red-500 hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-30">
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                    </div>
                                  )}
                                </div>
                              </article>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })()}
                </div>
                <div className="mt-3 p-3 bg-neutral-900/60 rounded-xl text-sm leading-relaxed">
                  <span className="font-bold text-white">Directriz del Entrenador:</span>
                  <span className="text-neutral-400 ml-1">{canEditPlans ? (routineAdviceDraft || defaultRoutine.specialistAdvice) : defaultRoutine.specialistAdvice}</span>
                </div>
              </div>
            )}

            {/* Catálogo completo de plantillas de rutinas expandidas */}
            <details className="group rounded-xl border border-neutral-800 bg-neutral-900/20">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                <div>
                  <span className="block text-xs font-black uppercase tracking-wider text-neutral-300">Catálogo adicional por objetivo</span>
                  <span className="mt-1 block text-[10px] text-neutral-500">Programas anteriores y plantillas manuales. Las 9 rutinas maestras están arriba.</span>
                </div>
                <span className="text-[10px] font-black uppercase text-neutral-400 group-open:hidden">Abrir</span>
                <span className="hidden text-[10px] font-black uppercase text-emerald-300 group-open:inline">Ocultar</span>
              </summary>
              <div className="space-y-3 border-t border-neutral-800 p-4">
                {professionalRoutines.map((tmpl) => {
                  const expanded = expandedRoutineIds.has(String(tmpl.id));
                  const isMatch = goal.toLowerCase().includes(tmpl.targetGoal.toLowerCase().split(' ')[0]);
                  return (
                    <div key={tmpl.id} className={`rounded-xl border overflow-hidden transition-all ${isMatch ? 'border-red-700/60 bg-red-950/10' : 'border-neutral-800 bg-neutral-900/30'}`}>
                      <button
                        onClick={() => toggleRoutine(String(tmpl.id))}
                        className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-neutral-900/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">{tmpl.title}</span>
                            {isMatch && <span className="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">Recomendado</span>}
                            <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">{tmpl.level}</span>
                            <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">{tmpl.daysPerWeek} días/sem</span>
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-1 line-clamp-1">{tmpl.description}</p>
                        </div>
                        {expanded ? <ChevronUp className="w-4 h-4 text-neutral-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />}
                      </button>

                      {expanded && (
                        <div className="px-4 pb-4 space-y-3 border-t border-neutral-800/60 pt-3 animate-fade-in">
                          <div className="bg-neutral-900/50 p-3 rounded-lg text-[11px]">
                            <span className="font-bold text-white block mb-0.5">Fundamento Técnico del Programa:</span>
                            <p className="text-neutral-400 leading-relaxed">{tmpl.trainerRationale}</p>
                          </div>

                          <div className="space-y-2">
                            {tmpl.days.map((day, dIdx) => (
                              <div key={dIdx} className="bg-black/30 rounded-lg border border-neutral-800/50 overflow-hidden">
                                <div className="bg-neutral-900/60 px-3 py-2 flex justify-between items-center border-b border-neutral-800/40">
                                  <div>
                                    <span className="text-[11px] font-bold text-red-400 block">{day.day}</span>
                                    <span className="text-[10px] text-neutral-400">{day.focus}</span>
                                  </div>
                                  <span className="text-[9px] text-neutral-500 bg-black/40 px-2 py-0.5 rounded">
                                    {day.exercises.length} ejercicios
                                  </span>
                                </div>
                                <div className="p-3 space-y-1.5">
                                  <div className="text-[10px] text-neutral-500 mb-2">
                                    <strong className="text-neutral-400">Calentamiento:</strong> {day.warmup}
                                  </div>
                                  {day.exercises.map((ex, exIdx) => (
                                    <div key={exIdx} className="grid grid-cols-12 gap-1 text-[10px] py-1 border-b border-neutral-900 last:border-0 items-start">
                                      <span className="col-span-5 text-neutral-200 font-medium">{ex.name}</span>
                                      <span className="col-span-2 text-red-400 font-mono font-bold">{ex.sets} x {ex.reps}</span>
                                      <span className="col-span-1 text-neutral-500 font-mono">{ex.rest}</span>
                                      <span className="col-span-4 text-neutral-500 italic">{ex.notes || ''} {ex.tempo ? `(Tempo: ${ex.tempo})` : ''}</span>
                                    </div>
                                  ))}
                                  <div className="text-[10px] text-neutral-500 mt-2 pt-1 border-t border-neutral-900">
                                    <strong className="text-neutral-400">Enfriamiento:</strong> {day.cooldown}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          </div>

          {/* PANEL: BASE DE DATOS NUTRICIONAL COMPLETA - SOLO ADMIN Y ENTRENADOR */}
          {canEditPlans && (
            <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-emerald-500" />
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Base Nutricional Profesional ({professionalFoods.length} alimentos)
                    </h3>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">
                      Visible únicamente para administrador y entrenadores.
                    </span>
                    {foodImageStatus && (
                      <span className="mt-1 block text-[10px] font-semibold text-emerald-300">{foodImageStatus}</span>
                    )}
                  </div>
                </div>
              </div>

              {(() => {
                const categories = [
                  { key: 'all', label: 'Todos' },
                  { key: 'protein', label: 'Proteínas' },
                  { key: 'carb', label: 'Carbohidratos' },
                  { key: 'fruit', label: 'Frutas' },
                  { key: 'fat', label: 'Grasas' },
                  { key: 'veg', label: 'Vegetales' },
                  { key: 'dairy', label: 'Lácteos' },
                  { key: 'drink', label: 'Bebidas' },
                  { key: 'snack', label: 'Snacks' },
                ];
                const filtered = professionalFoods.filter(f => {
                  const matchCat = foodFilter === 'all' || f.category === foodFilter;
                  const matchSearch = f.name.toLowerCase().includes(foodSearch.toLowerCase());
                  return matchCat && matchSearch;
                });

                return (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Buscar alimento..."
                        value={foodSearch}
                        onChange={e => setFoodSearch(e.target.value)}
                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-600"
                      />
                      <div className="flex gap-1 flex-wrap">
                        {categories.map(cat => (
                          <button
                            key={cat.key}
                            onClick={() => setFoodFilter(cat.key)}
                            className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all ${
                              foodFilter === cat.key ? 'bg-red-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 border border-neutral-800'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto space-y-1.5 pr-1">
                      {filtered.map((food, fIdx) => {
                        const goalConflict = food.avoidIfGoalIncludes?.some(w => goal.toLowerCase().includes(w));
                        const goalPreferred = food.preferIfGoalIncludes?.some(w => goal.toLowerCase().includes(w));
                        const categoryMeta = foodCategoryUi(food.category);
                        const foodKey = normalizeFoodKey(food.name);
                        const imageDraftValue = foodImageDrafts[foodKey] ?? foodImageOverrides[foodKey] ?? '';
                        return (
                          <div key={fIdx} className={`rounded-2xl border p-3 transition-all ${
                            goalConflict ? 'border-red-900/50 bg-red-950/10' : goalPreferred ? 'border-emerald-900/50 bg-emerald-950/10' : 'border-neutral-800/50 bg-neutral-900/30 hover:bg-neutral-900/60'
                          }`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <FoodImage name={food.name} category={food.category} overrides={foodImageOverrides} compact showSource className="h-14 w-14 shrink-0" />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-sm font-black text-white">{food.name}</span>
                                    {goalConflict && <span className="inline-flex items-center gap-0.5 rounded-full bg-red-600/30 px-2 py-0.5 text-[8px] font-black text-red-300"><AlertTriangle className="h-2.5 w-2.5" /> Precaución</span>}
                                    {goalPreferred && <span className="rounded-full bg-emerald-600/30 px-2 py-0.5 text-[8px] font-black text-emerald-300">Recomendado</span>}
                                  </div>
                                  <span className="mt-1 block text-[11px] font-bold text-neutral-400">{categoryMeta.label} · {compactFoodAdvice(food)}</span>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <span className="block text-sm font-black text-white">{food.calsPer100g}</span>
                                <span className="text-[9px] text-neutral-500">kcal/100g</span>
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                              {macroChipsForFood(food).map((chip) => (
                                <div key={chip.label} className="rounded-xl border border-neutral-800 bg-black/30 px-2 py-1.5">
                                  <span className="block text-[8px] font-black uppercase tracking-wide text-neutral-500">{chip.label}</span>
                                  <span className="text-[11px] font-black text-white">{chip.value}</span>
                                </div>
                              ))}
                            </div>
                            <details className="group mt-3">
                              <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-neutral-800 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-neutral-400">
                                <span>Ver notas nutricionales</span>
                                <span className="text-red-300 group-open:hidden">Abrir</span>
                                <span className="hidden text-emerald-300 group-open:inline">Ocultar</span>
                              </summary>
                              <div className="mt-2 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
                                <div className="rounded-xl bg-black/30 p-3 text-neutral-300"><strong className="text-white">Cliente:</strong> {food.clientNote}</div>
                                {canEditPlans && <div className={`rounded-xl bg-black/30 p-3 ${goalConflict ? 'text-red-300' : 'text-emerald-300'}`}><strong>Entrenador:</strong> {food.trainerNote}</div>}
                              </div>
    </details>
    {canEditPlans && (
      <details className="group mt-2">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-neutral-400">
          <span>Imagen del alimento</span>
          <span className="text-red-300 group-open:hidden">Editar</span>
          <span className="hidden text-emerald-300 group-open:inline">Ocultar</span>
        </summary>
        <div className="mt-3 grid gap-3 rounded-2xl border border-neutral-800 bg-black/30 p-3 sm:grid-cols-[92px_1fr]">
          <FoodImage name={food.name} category={food.category} overrides={foodImageOverrides} showSource className="h-24 w-full sm:w-24" />
          <div className="space-y-2">
            <input
              value={imageDraftValue}
              onChange={(event) => setFoodImageDrafts(prev => ({ ...prev, [foodKey]: event.target.value }))}
              placeholder="Pega URL https, /foods/... o /uploads/..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:border-red-600 focus:outline-none"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex-1 cursor-pointer rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-center text-[10px] font-black uppercase tracking-wide text-neutral-300 hover:border-neutral-500">
                Subir imagen
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    void handleUploadFoodImage(food.name, file);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
              <button onClick={() => void handleSaveFoodImageUrl(food.name)} className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white hover:bg-red-500">
                Guardar imagen
              </button>
            </div>
            <p className="text-[10px] leading-relaxed text-neutral-500">
              Recomendado: foto cuadrada o horizontal, 800px+, formato JPG/WebP. Si usas una URL externa, debe iniciar con https.
            </p>
          </div>
        </div>
      </details>
    )}
  </div>
);
                      })}
                      {filtered.length === 0 && (
                        <div className="text-center py-8 text-xs text-neutral-500">No se encontraron alimentos con ese criterio.</div>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-500 text-center pt-2 border-t border-neutral-900">
                      Mostrando {filtered.length} de {professionalFoods.length} alimentos. Valores nutricionales por cada 100 gramos de porción comestible.
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

        </div>

      </div>

      {/* MODAL / PANEL DESPLEGABLE DE SUSTITUCIÓN INTELIGENTE */}
      {substitutingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="bg-neutral-950 border border-neutral-800 w-full max-w-2xl max-h-[94dvh] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            
            <div className="bg-neutral-900 px-5 py-4 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block">Regla de Tres Nutricional</span>
                <h3 className="text-base font-bold text-white">Sustituir: {substitutingItem.item.currentName}</h3>
              </div>
              <button 
                onClick={() => { setSubstitutingItem(null); setSubstitutionSearch(''); }}
                className="text-neutral-400 hover:text-white text-sm font-bold"
                aria-label="Cerrar sustituciones"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 min-h-0 overflow-y-auto">
              <p className="text-xs text-neutral-300 leading-relaxed">
                Estás reemplazando un alimento del grupo <strong className="text-amber-400">{substitutionCategoryLabel(substitutingItem.item.category)}</strong>. Solo aparecen alimentos compatibles. La aplicación calcula una porción equivalente para el macronutriente principal de los <strong className="text-white">{substitutingItem.item.amountGrams}g</strong> originales. Si el menú ya está en el límite, equilibrará automáticamente otras porciones para que el total diario no supere las <strong className="text-white">{calculatedBaseCalories} kcal</strong> definidas para {nutritionTargets.goalLabel.toLowerCase()}.
              </p>

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                    {substitutionCategoryLabel(substitutingItem.item.category)} disponibles: {getSubstitutionOptions(substitutingItem.item).length}
                  </span>
                  <input
                    value={substitutionSearch}
                    onChange={(event) => setSubstitutionSearch(event.target.value)}
                    placeholder={`Buscar ${substitutionCategoryLabel(substitutingItem.item.category)}...`}
                    className="w-full sm:w-64 rounded-lg border border-neutral-800 bg-black px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
                
                {getSubstitutionOptions(substitutingItem.item).map((subFood, sIdx) => {
                  const preview = calculateMacroAwareEquivalence(substitutingItem.item, subFood, { maxSubstituteCalories: substitutionCalorieAllowance(substitutingItem.item) });
                  const previewGrams = preview.grams;
                  const projectedDailyCalories = Math.round(currentPlanMacros.cals - preview.original.calories + preview.substitute.calories);
                  const goalConflict = subFood.avoidIfGoalIncludes?.some((word) => goal.toLowerCase().includes(word));
                  const focusValue = substitutingItem.item.category === 'protein'
                    ? preview.original.protein
                    : substitutingItem.item.category === 'carb'
                      ? preview.original.carbs
                      : substitutingItem.item.category === 'fat'
                        ? preview.original.fat
                        : preview.original.calories;
                  const focusUnit = substitutingItem.item.category === 'protein'
                    ? 'g proteína'
                    : substitutingItem.item.category === 'carb'
                      ? 'g carbohidratos'
                      : substitutingItem.item.category === 'fat'
                        ? 'g grasa'
                        : 'kcal';

                  return (
                    <div 
                      key={sIdx}
                      onClick={() => handlePerformSubstitution(subFood)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all group bg-neutral-900/50 border-neutral-800 hover:bg-neutral-900 hover:border-amber-500/50 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors block">
                          {subFood.name}
                        </span>
                        <span className="text-[10px] text-neutral-500 block">
                          P {subFood.proteinPer100g}g · C {subFood.carbsPer100g}g · G {subFood.fatPer100g}g · {subFood.calsPer100g} kcal por cada 100g
                        </span>
                        <span className="text-[10px] text-neutral-400 block mt-1 max-w-xs leading-snug">
                          Cliente: {subFood.clientNote}
                        </span>
                        <span className={`text-[10px] block mt-1 max-w-xs leading-snug ${goalConflict ? 'text-red-400' : 'text-emerald-400'}`}>
                          Entrenador: {goalConflict ? 'Precaución: ' : ''}{subFood.trainerNote}
                        </span>
                      </div>

                      <div className="w-full sm:w-auto text-left sm:text-right shrink-0 rounded-lg bg-black/30 px-3 py-2">
                        <span className="text-xs font-extrabold text-amber-400 block font-mono">
                          Consumir: {previewGrams}g
                        </span>
                        <span className="text-[9px] block text-emerald-400">
                          Iguala {focusValue.toFixed(1)} {focusUnit}
                        </span>
                        <span className={`text-[9px] block ${preview.compatibility === 'alta' ? 'text-emerald-400' : preview.compatibility === 'media' ? 'text-amber-400' : 'text-red-400'}`}>{preview.accuracyPercent}% de similitud total</span>
                        <span className={`text-[9px] block ${projectedDailyCalories <= calculatedBaseCalories ? 'text-sky-300' : 'text-red-400'}`}>Día: {projectedDailyCalories}/{calculatedBaseCalories} kcal {projectedDailyCalories > calculatedBaseCalories ? '· se equilibrará al confirmar' : preview.calorieCapApplied ? '· porción ajustada al límite' : ''}</span>
                        <span className="text-[9px] text-neutral-500 block">Δ P {preview.deltas.protein >= 0 ? '+' : ''}{preview.deltas.protein.toFixed(1)} · C {preview.deltas.carbs >= 0 ? '+' : ''}{preview.deltas.carbs.toFixed(1)} · G {preview.deltas.fat >= 0 ? '+' : ''}{preview.deltas.fat.toFixed(1)} g</span>
                      </div>
                    </div>
                  );
                })}

                {getSubstitutionOptions(substitutingItem.item).length === 0 && (
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-6 text-center text-xs text-neutral-400">
                    No se encontraron alimentos en esta categoría con esa búsqueda.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-neutral-900/60 px-5 py-3 border-t border-neutral-800 text-right">
              <button
                onClick={() => { setSubstitutingItem(null); setSubstitutionSearch(''); }}
                className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
