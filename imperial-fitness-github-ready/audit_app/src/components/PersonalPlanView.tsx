import React, { useState, useEffect, useMemo } from 'react';
import { UserCheck, RefreshCw, Sliders, HelpCircle, Utensils, Dumbbell, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { ClientProfile, DietPlan, WorkoutRoutine, DietMealItem, FOOD_DATABASE, ROUTINE_TEMPLATES } from '../data/mockData';
import type { FoodItem, RoutineTemplate } from '../data/foodDatabase';
import { generateImperialRoutine, TRAINING_DAYS, TrainingGoal, TrainingLevel, IMPERIAL_EQUIPMENT } from '../data/gymProgramming';
import { calculateEquivalenceFromApi, createDietPlanInApi, createFoodInApi, deleteDietPlanInApi, getMyDietPlanFromApi, getScienceGuidelinesFromApi, listDietPlansFromApi, listFoodsFromApi, updateDietPlanInApi } from '../services/nutritionService';
import { createAssignedRoutineInApi, createRoutineTemplateInApi, deactivateAssignedRoutineInApi, getMyAssignedRoutineFromApi, listAssignedRoutinesFromApi, listRoutineTemplatesFromApi, updateAssignedRoutineInApi } from '../services/routineService';
import { listClientsFromApi } from '../services/userService';

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

  // Parámetros biométricos sincronizados para el recálculo en tiempo real
  const [weight, setWeight] = useState(activeClientObj.weight || 70);
  const [bodyFat, setBodyFat] = useState(activeClientObj.bodyFat || 18);
  const [muscleMass, setMuscleMass] = useState(activeClientObj.muscleMass || 32);
  const [goal, setGoal] = useState(activeClientObj.goal || 'Tonificación y Rendimiento');

  // Estado para las sustituciones: qué ítem estamos cambiando en qué comida
  const [substitutingItem, setSubstitutingItem] = useState<{ mealIndex: number; itemIndex: number; item: DietMealItem } | null>(null);
  const [foodFilter, setFoodFilter] = useState<string>('all');
  const [foodSearch, setFoodSearch] = useState('');
  const [apiFoods, setApiFoods] = useState<FoodItem[]>([]);
  const [apiRoutines, setApiRoutines] = useState<RoutineTemplate[]>([]);
  const [apiStatus, setApiStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const [saveStatus, setSaveStatus] = useState('');
  const [expandedRoutineIds, setExpandedRoutineIds] = useState<Set<string>>(new Set());
  const [manualMealName, setManualMealName] = useState('Almuerzo Personalizado');
  const [manualFoodName, setManualFoodName] = useState('Pechuga de pollo a la plancha');
  const [manualGrams, setManualGrams] = useState(150);
  const [manualCategory, setManualCategory] = useState<DietMealItem['category']>('protein');
  const [manualCarbsPer100, setManualCarbsPer100] = useState(0);
  const [manualCalsPer100, setManualCalsPer100] = useState(165);
  const [trainingGoal, setTrainingGoal] = useState<TrainingGoal>('hipertrofia');
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>('Intermedio');
  const [selectedTrainingDays, setSelectedTrainingDays] = useState<string[]>(['Lunes', 'Miércoles', 'Viernes']);
  const [routineStatus, setRoutineStatus] = useState('');
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
  const [templateStatus, setTemplateStatus] = useState('');
  const [scienceNotice, setScienceNotice] = useState('');

  const canEditPlans = currentUser.role !== 'client';

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
    specialistDiagnosis: 'Este cliente todavía no tiene una dieta activa registrada en la API.',
  });
  const defaultDiet = existingDiets.find(d => d.clientId === targetClientId) || createEmptyDiet(activeClientObj);
  const [liveDietPlan, setLiveDietPlan] = useState<DietPlan>(JSON.parse(JSON.stringify(defaultDiet)));

  // Copia local de la rutina activa
  const defaultRoutine = activeRoutine || existingRoutines.find(r => r.clientId === targetClientId) || null;

  const professionalFoods = apiFoods.length >= 50 ? apiFoods : FOOD_DATABASE;
  const professionalRoutines = apiRoutines.length >= 3 ? apiRoutines : ROUTINE_TEMPLATES;

  const refreshAssignedPlans = async (showMessage = true) => {
    try {
      if (currentUser.role === 'client') {
        const [diet, routine] = await Promise.all([
          getMyDietPlanFromApi(),
          getMyAssignedRoutineFromApi(),
        ]);
        if (diet) {
          setLiveDietPlan(JSON.parse(JSON.stringify(diet)));
          setPlanNotesDraft(diet.specialistDiagnosis || '');
          onGenerateDiet(diet);
        }
        if (routine) {
          setActiveRoutine(routine);
          setRoutineTitleDraft(routine.title);
          setRoutineObjectiveDraft(routine.objective);
          setRoutineAdviceDraft(routine.specialistAdvice || '');
          onGenerateRoutine(routine);
        } else {
          setActiveRoutine(null);
        }
        if (showMessage) {
          setSaveStatus(diet ? 'Plan del cliente sincronizado desde backend.' : 'No hay dieta asignada todavía en backend.');
          setRoutineStatus(routine ? 'Rutina del cliente sincronizada desde backend.' : 'No hay rutina asignada todavía en backend.');
        }
        return;
      }

      const [dietsFromApi, routinesFromApi] = await Promise.all([
        listDietPlansFromApi(targetClientId),
        listAssignedRoutinesFromApi(targetClientId),
      ]);
      const activeDiet = dietsFromApi[0];
      const activeRoutine = routinesFromApi[0];
      if (activeDiet) {
        setLiveDietPlan(JSON.parse(JSON.stringify(activeDiet)));
        setPlanNotesDraft(activeDiet.specialistDiagnosis || '');
        onGenerateDiet(activeDiet);
      }
      if (activeRoutine) {
        setActiveRoutine(activeRoutine);
        setRoutineTitleDraft(activeRoutine.title);
        setRoutineObjectiveDraft(activeRoutine.objective);
        setRoutineAdviceDraft(activeRoutine.specialistAdvice || '');
        onGenerateRoutine(activeRoutine);
      } else {
        setActiveRoutine(null);
      }
      if (showMessage) {
        setSaveStatus(activeDiet ? 'Dieta sincronizada desde backend.' : 'Este cliente todavía no tiene dieta en backend.');
        setRoutineStatus(activeRoutine ? 'Rutina sincronizada desde backend.' : 'Este cliente todavía no tiene rutina en backend.');
      }
    } catch {
      if (showMessage) {
        setSaveStatus('No se pudo sincronizar con backend. Revisa conexión, token o permisos.');
        setRoutineStatus('No se pudo sincronizar con backend.');
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadApiData() {
      try {
        const [foods, routines] = await Promise.all([
          listFoodsFromApi(),
          listRoutineTemplatesFromApi(),
        ]);
        if (!cancelled) {
          setApiFoods(foods);
          setApiRoutines(routines);
          setApiStatus('connected');
        }
      } catch {
        if (!cancelled) {
          setApiStatus('offline');
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
    refreshAssignedPlans(false);
  }, [targetClientId, currentUser.id, currentUser.role]);

  // Actualizar valores cuando se cambia el cliente desde el selector superior
  useEffect(() => {
    const found = clientsOnly.find(c => c.id === targetClientId);
    if (found) {
      setWeight(found.weight || 70);
      setBodyFat(found.bodyFat || 18);
      setMuscleMass(found.muscleMass || 32);
      setGoal(found.goal || 'Tonificación y Rendimiento');

      const matchingDiet = existingDiets.find(d => d.clientId === targetClientId) || createEmptyDiet(found);
      const matchingRoutine = existingRoutines.find(r => r.clientId === targetClientId) || null;
      setLiveDietPlan(JSON.parse(JSON.stringify(matchingDiet)));
      setPlanNotesDraft(matchingDiet.specialistDiagnosis || '');
      setActiveRoutine(matchingRoutine);
      setRoutineTitleDraft(matchingRoutine?.title || '');
      setRoutineObjectiveDraft(matchingRoutine?.objective || '');
      setRoutineAdviceDraft(matchingRoutine?.specialistAdvice || '');
    }
  }, [targetClientId, users, apiClients, existingDiets, existingRoutines]);

  // --- LÓGICA DE RECÁLCULO CONSTANTE SEGÚN PESO, GRASA Y MASA MUSCULAR ---
  // Fórmula metabólica del nutricionista de Imperial Fitness:
  // Calorías Base = (Masa Muscular * 32) + (Peso * 14) - (Grasa * 12) + Ajuste por objetivo
  const isDeficit = goal.toLowerCase().includes('grasa') || goal.toLowerCase().includes('pérdida');
  const calculatedBaseCalories = Math.round((muscleMass * 30) + (weight * 12) - (bodyFat * 10) + (isDeficit ? -300 : 250));
  
  // Recalcular macros globales en tiempo real
  const liveProtein = Math.round(weight * 2.2); // 2.2g por kg
  const liveFat = Math.round((calculatedBaseCalories * 0.25) / 9);
  const liveCarbs = Math.max(50, Math.round((calculatedBaseCalories - (liveProtein * 4 + liveFat * 9)) / 4));

  const foodByName = (keywords: string[], fallback: { name: string; carbs: number; cals: number; category: DietMealItem['category'] }) => {
    const found = professionalFoods.find(food => keywords.some(keyword => food.name.toLowerCase().includes(keyword.toLowerCase())));
    if (!found) {
      return {
        name: fallback.name,
        carbsPer100g: fallback.carbs,
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
    return { name: found.name, carbsPer100g: found.carbsPer100g, calsPer100g: found.calsPer100g, category };
  };

  const item = (id: string, food: ReturnType<typeof foodByName>, grams: number): DietMealItem => ({
    id,
    originalName: food.name,
    currentName: food.name,
    amountGrams: grams,
    baseCarbsPer100g: food.carbsPer100g,
    baseCalsPer100g: food.calsPer100g,
    category: food.category,
  });

  const buildAutomaticDiet = (): DietPlan => {
    const proteinFactor = Math.max(0.8, Math.min(1.25, liveProtein / 160));
    const carbFactor = Math.max(0.75, Math.min(1.35, liveCarbs / 190));
    const fatFactor = Math.max(0.75, Math.min(1.25, liveFat / 65));

    const claras = foodByName(['claras'], { name: 'Claras de huevo', carbs: 1, cals: 52, category: 'protein' });
    const avena = foodByName(['avena'], { name: 'Avena en hojuelas', carbs: 66, cals: 389, category: 'carb' });
    const fresas = foodByName(['fresas'], { name: 'Fresas', carbs: 8, cals: 32, category: 'carb' });
    const pollo = foodByName(['pechuga de pollo', 'pollo'], { name: 'Pechuga de pollo a la plancha', carbs: 0, cals: 165, category: 'protein' });
    const papa = foodByName(['papa cocida'], { name: 'Papa cocida', carbs: 17, cals: 77, category: 'carb' });
    const arroz = foodByName(['arroz integral'], { name: 'Arroz integral cocido', carbs: 23, cals: 112, category: 'carb' });
    const brocoli = foodByName(['brócoli', 'brocoli'], { name: 'Brócoli al vapor', carbs: 4, cals: 35, category: 'veg' });
    const yogur = foodByName(['yogur griego'], { name: 'Yogur griego natural sin azúcar', carbs: 4, cals: 59, category: 'protein' });
    const tilapia = foodByName(['tilapia', 'corvina'], { name: 'Tilapia al vapor', carbs: 0, cals: 128, category: 'protein' });
    const aguacate = foodByName(['aguacate'], { name: 'Aguacate Hass', carbs: 8, cals: 160, category: 'fat' });

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
          name: 'Desayuno de Control Metabólico',
          items: [
            item('auto-1', claras, Math.round(180 * proteinFactor)),
            item('auto-2', avena, Math.round((isDeficit ? 35 : 55) * carbFactor)),
            item('auto-3', fresas, 120),
          ],
        },
        {
          name: 'Almuerzo de Rendimiento',
          items: [
            item('auto-4', pollo, Math.round(190 * proteinFactor)),
            item('auto-5', isDeficit ? papa : arroz, Math.round((isDeficit ? 220 : 170) * carbFactor)),
            item('auto-6', brocoli, 130),
            item('auto-7', aguacate, Math.round(35 * fatFactor)),
          ],
        },
        {
          name: 'Snack Pre / Post Entreno',
          items: [
            item('auto-8', yogur, Math.round(180 * proteinFactor)),
            item('auto-9', isDeficit ? fresas : avena, Math.round((isDeficit ? 150 : 35) * carbFactor)),
          ],
        },
        {
          name: 'Cena de Recuperación',
          items: [
            item('auto-10', tilapia, Math.round(210 * proteinFactor)),
            item('auto-11', papa, Math.round((isDeficit ? 160 : 220) * carbFactor)),
            item('auto-12', brocoli, 150),
          ],
        },
      ],
      hydration: `Consumir ${Math.max(2.5, Math.round(weight * 0.045 * 10) / 10)} litros de agua al día.`,
      supplementation: ['Creatina monohidratada 5g/día si el entrenador la aprueba', 'Omega 3 si la alimentación semanal es baja en pescado'],
      specialistDiagnosis: `Plan automático generado para ${activeClientObj.name}: ${calculatedBaseCalories} kcal, ${liveProtein}g proteína, ${liveCarbs}g carbohidratos y ${liveFat}g grasas. Debe ser revisado por entrenador antes de cambios grandes.`,
    };
  };

  const handleGenerateAutomaticDiet = async () => {
    const generated = buildAutomaticDiet();
    setLiveDietPlan(generated);
    onGenerateDiet(generated);
    setSaveStatus('Dieta automática generada.');
    if (currentUser.role !== 'client') {
      try {
        const saved = await createDietPlanInApi(generated);
        onGenerateDiet(saved);
        setSaveStatus('Dieta generada y asignada al cliente en el backend.');
      } catch {
        setSaveStatus('Dieta generada localmente, pero no se pudo guardar en backend. Revisa permisos/API.');
      }
    }
  };

  // Aplicar factor de escalado a las porciones de la dieta cargada en función de las calorías calculadas vs las originales
  useEffect(() => {
    if (!liveDietPlan) return;
    const factor = calculatedBaseCalories / (liveDietPlan.baseCalories || 2000);
    
    // Crear copia ajustada para no mutar el estado de origen
    const updatedMeals = liveDietPlan.meals.map(meal => {
      const updatedItems = meal.items.map(item => {
        // Escalar ligeramente los gramos propuestos
        const newGrams = Math.max(20, Math.round(item.amountGrams * (factor > 1.3 ? 1.3 : factor < 0.7 ? 0.7 : factor)));
        return { ...item, amountGrams: newGrams };
      });
      return { ...meal, items: updatedItems };
    });

    setLiveDietPlan(prev => ({
      ...prev,
      baseCalories: calculatedBaseCalories,
      protein: liveProtein,
      carbs: liveCarbs,
      fat: liveFat,
      meals: updatedMeals,
      specialistDiagnosis: planNotesDraft || `Diagnóstico actualizado por el Especialista: Basado en el peso actual (${weight}kg), índice magro de ${muscleMass}kg y una grasa del ${bodyFat}%, el metabolismo de mantenimiento y desarrollo requiere exactamente ${calculatedBaseCalories} Kcal diarias distribuidas de forma limpia para evitar acumulación adiposa.`
    }));
  }, [weight, bodyFat, muscleMass, calculatedBaseCalories, liveProtein, liveCarbs, liveFat]);

  // --- LÓGICA DE SUSTITUCIÓN INTELIGENTE DE ALIMENTOS ---
  const handlePerformSubstitution = async (substituteFood: FoodItem) => {
    if (!substitutingItem) return;
    
    const { mealIndex, itemIndex, item } = substitutingItem;
    
    // Calcular equivalencia nutricional por regla de tres
    // Si el alimento original aportaba cierta cantidad de carbohidratos o calorías, calculamos los gramos necesarios del nuevo
    let equivalentGrams = item.amountGrams;
    
    if (substituteFood.category === 'carb' || substituteFood.category === 'fruit') {
      const originalCarbsContributed = (item.amountGrams * item.baseCarbsPer100g) / 100;
      // Gramos necesarios del nuevo para igualar los carbohidratos:
      equivalentGrams = Math.round((originalCarbsContributed * 100) / substituteFood.carbsPer100g);
    } else {
      // Sustitución proteica o general basada en calorías
      const originalCalsContributed = (item.amountGrams * item.baseCalsPer100g) / 100;
      equivalentGrams = Math.round((originalCalsContributed * 100) / substituteFood.calsPer100g);
    }

    // Prevenir gramos absurdos
    if (isNaN(equivalentGrams) || equivalentGrams < 10) equivalentGrams = 50;
    if (equivalentGrams > 400) equivalentGrams = 350;

    const originalFromApi = professionalFoods.find(f => f.name.toLowerCase() === item.originalName.toLowerCase() && f.id);
    if (originalFromApi?.id && substituteFood.id) {
      try {
        const apiEquivalence = await calculateEquivalenceFromApi(originalFromApi.id, substituteFood.id, item.amountGrams);
        equivalentGrams = Math.round(apiEquivalence.substitute_grams);
      } catch {
        // Keep local equivalence when the API is not reachable.
      }
    }

    // Actualizar el plan en vivo
    const updatedMeals = [...liveDietPlan.meals];
    updatedMeals[mealIndex].items[itemIndex] = {
      ...item,
      currentName: substituteFood.name,
      amountGrams: equivalentGrams,
      baseCarbsPer100g: substituteFood.carbsPer100g,
      baseCalsPer100g: substituteFood.calsPer100g
    };

    setLiveDietPlan({
      ...liveDietPlan,
      meals: updatedMeals
    });

    // Guardar también globalmente
    onGenerateDiet({
      ...liveDietPlan,
      meals: updatedMeals
    });

    setSubstitutingItem(null);
  };

  const handleSavePrescription = async () => {
    const planToSave = {
      ...liveDietPlan,
      baseCalories: calculatedBaseCalories,
      protein: liveProtein,
      carbs: liveCarbs,
      fat: liveFat,
      goal,
      specialistDiagnosis: planNotesDraft || liveDietPlan.specialistDiagnosis,
    };
    setLiveDietPlan(planToSave);
    onGenerateDiet(planToSave);
    if (currentUser.role !== 'client') {
      try {
        const saveAction = planToSave.id && !planToSave.id.startsWith('empty-') && !planToSave.id.startsWith('auto-')
          ? updateDietPlanInApi(planToSave.id, planToSave)
          : createDietPlanInApi(planToSave);
        const saved = await saveAction;
        setLiveDietPlan(JSON.parse(JSON.stringify(saved)));
        setPlanNotesDraft(saved.specialistDiagnosis || '');
        onGenerateDiet(saved);
        setSaveStatus(planToSave.id && !planToSave.id.startsWith('empty-') && !planToSave.id.startsWith('auto-') ? 'Plan actualizado en backend correctamente.' : 'Plan guardado y asignado en backend correctamente.');
      } catch {
        setSaveStatus('Plan guardado localmente, pero no se pudo asignar en backend. Revisa API/permisos.');
      }
    } else {
      setSaveStatus('Cambios guardados en vista local. El entrenador debe aprobar el plan oficial.');
    }
  };

  const handleAddManualItem = () => {
    if (!manualFoodName.trim() || manualGrams <= 0) return;
    const newItem: DietMealItem = {
      id: `manual-${Date.now()}`,
      originalName: manualFoodName.trim(),
      currentName: manualFoodName.trim(),
      amountGrams: manualGrams,
      baseCarbsPer100g: manualCarbsPer100,
      baseCalsPer100g: manualCalsPer100,
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
    };
    setLiveDietPlan(updated);
    onGenerateDiet(updated);
    setSaveStatus('Alimento agregado manualmente. Pulsa Guardar Ajustes para asignarlo en backend.');
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
      setTemplateStatus('No se pudo crear la plantilla manual de rutina. Revisa API/permisos.');
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

  const handleGenerateRoutine = () => {
    if (!canEditPlans) return;
    const routine = generateImperialRoutine({
      client: activeClientObj,
      goal: trainingGoal,
      level: trainingLevel,
      selectedDays: selectedTrainingDays,
    });
    onGenerateRoutine(routine);
    createAssignedRoutineInApi(routine)
      .then((saved) => {
        setActiveRoutine(saved);
        setRoutineTitleDraft(saved.title);
        setRoutineObjectiveDraft(saved.objective);
        setRoutineAdviceDraft(saved.specialistAdvice || '');
        onGenerateRoutine(saved);
        setRoutineStatus('Rutina generada y asignada al cliente en backend.');
      })
      .catch(() => setRoutineStatus('Rutina generada localmente, pero no se pudo guardar en backend. Revisa API/permisos.'));
  };



  const handleUpdateActiveRoutine = async () => {
    if (!canEditPlans || !defaultRoutine) return;
    const updatedRoutine: WorkoutRoutine = {
      ...defaultRoutine,
      title: routineTitleDraft.trim() || defaultRoutine.title,
      objective: routineObjectiveDraft.trim() || defaultRoutine.objective,
      specialistAdvice: routineAdviceDraft.trim() || defaultRoutine.specialistAdvice,
    };
    try {
      const saved = await updateAssignedRoutineInApi(defaultRoutine.id, updatedRoutine);
      setActiveRoutine(saved);
      onGenerateRoutine(saved);
      setRoutineTitleDraft(saved.title);
      setRoutineObjectiveDraft(saved.objective);
      setRoutineAdviceDraft(saved.specialistAdvice || '');
      setRoutineStatus('Rutina actualizada en backend y sincronizada para el cliente.');
    } catch {
      setRoutineStatus('No se pudo actualizar la rutina. Revisa conexión, token o permisos.');
    }
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
      setRoutineStatus('Rutina retirada del cliente. El historial queda protegido en backend.');
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
            Recálculo calórico al instante basado en medidas antropométricas reales y motor de sustitución de alimentos avalado por nutricionistas.
          </p>
        </div>

        {/* Selector de Cliente si es admin o trainer */}
        {currentUser.role !== 'client' && (
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
              <img 
                src={activeClientObj.avatar} 
                alt={activeClientObj.name} 
                className="w-10 h-10 rounded-full object-cover border border-red-600 shrink-0"
              />
            )}
          </div>
        )}

        {/* Vista estática del cliente actual si tiene rol client */}
        {currentUser.role === 'client' && (
          <div className="flex items-center gap-3 bg-neutral-900/80 px-4 py-2.5 rounded-xl border border-neutral-800">
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="w-11 h-11 rounded-full object-cover border-2 border-red-600 shrink-0" 
            />
            <div>
              <span className="text-[10px] text-neutral-500 block uppercase font-bold tracking-wider">Cliente VIP</span>
              <span className="text-sm font-bold text-white">{currentUser.name}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
        <div>
          <p className="text-sm font-bold text-white">Sincronización de asignaciones</p>
          <p className="text-xs text-neutral-400 mt-1">Actualiza desde backend la dieta y rutina activas del cliente seleccionado sin cerrar sesión.</p>
        </div>
        <button
          type="button"
          onClick={() => refreshAssignedPlans(true)}
          className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-red-600 text-xs font-bold text-white transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4 text-red-500" /> Sincronizar plan asignado
        </button>
      </div>

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
              <span className="text-white font-bold font-mono text-sm">{bodyFat}%</span>
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
              min="5" 
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
              <span className="text-white font-bold font-mono text-sm">{muscleMass} kg</span>
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
              min="20" 
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
              <option value="Hipertrofia">Hipertrofia</option>
              <option value="Fuerza">Fuerza</option>
              <option value="Resistencia">Resistencia</option>
              <option value="Salud sostenible">Salud sostenible</option>
              <option value="Pérdida de Grasa Acelerada">Pérdida de Grasa Acelerada</option>
              <option value="Aumento de Fuerza Magra">Aumento de Fuerza Magra</option>
              <option value="Acondicionamiento y Resistencia">Acondicionamiento y Resistencia</option>
            </select>
          </div>

          {canEditPlans ? (
            <button
              onClick={handleSavePrescription}
              className="w-full mt-2 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 hover:border-red-600 text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 text-red-500 animate-spin-slow" /> Guardar Ajustes en Perfil
            </button>
          ) : (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 text-[11px] text-neutral-400">
              Tu entrenador administra cambios de dieta y rutina. Esta vista es informativa para el cliente.
            </div>
          )}
          {saveStatus && <p className="text-[11px] text-emerald-400 leading-relaxed">{saveStatus}</p>}
        </div>

        {/* Dashboard de Calorías y Dieta Súper Premium */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* BANNER MACROS RESULTANTES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-neutral-950 p-5 rounded-2xl border border-neutral-800">
            <div className="bg-black/50 p-3.5 rounded-xl border border-neutral-900 text-center">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Calorías Diarias</span>
              <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight block mt-1 font-mono">
                {calculatedBaseCalories}
              </span>
              <span className="text-[9px] text-red-500 font-medium block mt-0.5">Recálculo al vuelo</span>
            </div>

            <div className="bg-black/50 p-3.5 rounded-xl border border-neutral-900 text-center">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Proteína Pura</span>
              <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight block mt-1 font-mono">
                {liveProtein}g
              </span>
              <span className="text-[9px] text-neutral-400 block mt-0.5">~2.2g / kg de peso</span>
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
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">Generación automática de dieta</span>
                <span className="text-[11px] text-neutral-400 block mt-1">
                  Solo entrenador/admin puede generar y asignar dietas. El cliente ve el plan asignado y puede solicitar cambios al coach.
                </span>
                {saveStatus && <span className="text-[11px] text-emerald-400 block mt-2">{saveStatus}</span>}
              </div>
              <button
                onClick={handleGenerateAutomaticDiet}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shrink-0 flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Generar y asignar dieta
              </button>
            </div>
          )}

          {!canEditPlans && liveDietPlan.meals.length === 0 && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-center">
              <span className="text-xs font-bold text-neutral-300 block">Tu dieta aún no ha sido asignada</span>
              <p className="text-[11px] text-neutral-500 mt-1">El entrenador o administrador debe generar o crear tu dieta para que aparezca aquí.</p>
            </div>
          )}

          {currentUser.role !== 'client' && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">Crear dieta manualmente</span>
                <span className="text-[11px] text-neutral-400 block mt-1">Agrega alimentos por comida. Luego pulsa “Guardar Ajustes” para asignarlo al cliente.</span>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input type="number" value={manualCarbsPer100} onChange={(e) => setManualCarbsPer100(Number(e.target.value))} placeholder="Carbs x 100g" className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600 font-mono" />
                <input type="number" value={manualCalsPer100} onChange={(e) => setManualCalsPer100(Number(e.target.value))} placeholder="Kcal x 100g" className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600 font-mono" />
                <button onClick={handleAddManualItem} className="bg-neutral-100 hover:bg-white text-black font-bold text-xs px-3 py-2 rounded-lg transition-colors">Agregar alimento manual</button>
              </div>
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
                placeholder="Diagnóstico, indicaciones o ajustes del nutricionista/coach..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-600 resize-none"
              />
            </div>
          )}

          {/* DIAGNÓSTICO PROFESIONAL */}
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs">
            <span className="font-bold text-red-500 uppercase tracking-wider block mb-1 text-[10px]">
              📋 Criterio del Nutricionista Asignado
            </span>
            <p className="text-neutral-300 leading-relaxed italic">
              "{liveDietPlan?.specialistDiagnosis}"
            </p>
          </div>

          {/* TARJETAS PREMIUM DE COMIDAS (Diseño espectacular superior a texto plano) */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Utensils className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Distribución de Porciones por Comida
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveDietPlan?.meals.length > 0 ? liveDietPlan.meals.map((meal, mIndex) => (
                <div key={mIndex} className="bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden flex flex-col justify-between hover:border-neutral-700 transition-colors">
                  {/* Encabezado de la comida */}
                  <div className="bg-neutral-900/60 px-4 py-3 border-b border-neutral-800 flex justify-between items-center">
                    <span className="font-bold text-white text-xs tracking-wide">{meal.name}</span>
                    <span className="text-[10px] bg-black px-2 py-0.5 rounded text-neutral-400 font-mono">
                      Comida 0{mIndex + 1}
                    </span>
                  </div>

                  {/* Lista de Alimentos con botón Sustituir */}
                  <div className="p-4 space-y-3 flex-1">
                    {meal.items.map((item, iIndex) => (
                      <div key={iIndex} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-neutral-900/30 border border-neutral-800/60 hover:bg-neutral-900/60 transition-colors">
                        <div>
                          <span className="text-xs font-bold text-white block">
                            {item.amountGrams}g <span className="text-neutral-300 font-medium">{item.currentName}</span>
                          </span>
                          <span className="text-[10px] text-neutral-500 block">
                            Equivalencia original: {item.originalName}
                          </span>
                        </div>

                        <button
                          onClick={() => setSubstitutingItem({ mealIndex: mIndex, itemIndex: iIndex, item })}
                          className="bg-neutral-900 hover:bg-neutral-800 text-[10px] text-amber-400 border border-neutral-700 hover:border-amber-500/50 px-2.5 py-1 rounded transition-all font-semibold shrink-0"
                        >
                          Sustituir
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Footer con hidratación o tip */}
                  <div className="bg-black/40 px-4 py-2 border-t border-neutral-900 text-[10px] text-neutral-500 text-right">
                    Consumo sugerido con agua o infusión
                  </div>
                </div>
              )) : (
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
                {professionalRoutines.length} programas disponibles · {apiStatus === 'connected' ? 'API conectada' : apiStatus === 'offline' ? 'Modo local' : 'Conectando API...'}
              </span>
            </div>

            {canEditPlans && (
              <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-4 space-y-4">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">Generador de rutina con máquinas Imperial</span>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Solo entrenador/admin puede generar rutinas. El cliente únicamente ve la rutina asignada.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  <button onClick={handleGenerateRoutine} className="self-end bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors">
                    Generar rutina asignada
                  </button>
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-500 uppercase mb-2">Días de entrenamiento</label>
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
            )}

            {/* Rutina asignada actualmente al cliente */}
            {defaultRoutine && (
              <div className="bg-red-950/20 p-4 rounded-xl border border-red-900/40 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block mb-1">Rutina Activa Asignada</span>
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
                        <span className="text-sm font-bold text-white block">{defaultRoutine.title}</span>
                        <p className="text-xs text-neutral-400 mt-1">{defaultRoutine.objective}</p>
                      </>
                    )}
                  </div>
                  {canEditPlans && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleUpdateActiveRoutine}
                        className="bg-neutral-100 hover:bg-white text-black font-bold text-xs px-3 py-2 rounded-lg transition-colors"
                      >
                        Actualizar rutina
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

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                  {defaultRoutine.days.map((dayObj, dIdx) => (
                    <div key={dIdx} className="bg-black/40 p-2.5 rounded-lg border border-neutral-800/60">
                      <span className="text-[10px] font-bold text-red-400 block">{dayObj.day}</span>
                      <span className="text-[10px] text-neutral-400 block mb-1.5">{dayObj.focus}</span>
                      {dayObj.exercises.map((ex, exIdx) => (
                        <div key={exIdx} className="text-[10px] text-neutral-300 flex justify-between py-0.5 border-b border-neutral-900 last:border-0">
                          <span className="truncate pr-1">{ex.name}</span>
                          <span className="font-mono text-neutral-500 shrink-0">{ex.sets}x{ex.reps.split(' ')[0]}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-2.5 bg-neutral-900/40 rounded-lg text-[11px]">
                  <span className="font-bold text-white">Directriz del Entrenador:</span>
                  <span className="text-neutral-400 ml-1">{canEditPlans ? (routineAdviceDraft || defaultRoutine.specialistAdvice) : defaultRoutine.specialistAdvice}</span>
                </div>
              </div>
            )}

            {/* Catálogo completo de plantillas de rutinas expandidas */}
            <div>
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-3">
                Catálogo Completo de Programas por Objetivo
              </span>
              <div className="space-y-3">
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
            </div>
          </div>

          {/* PANEL: BASE DE DATOS NUTRICIONAL COMPLETA - SOLO ADMIN Y ENTRENADOR */}
          {currentUser.role !== 'client' && (
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
                        return (
                          <div key={fIdx} className={`p-3 rounded-lg border transition-all ${
                            goalConflict ? 'border-red-900/50 bg-red-950/10' : goalPreferred ? 'border-emerald-900/50 bg-emerald-950/10' : 'border-neutral-800/50 bg-neutral-900/30 hover:bg-neutral-900/60'
                          }`}>
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-white">{food.name}</span>
                                  {goalConflict && <span className="text-[8px] bg-red-600/30 text-red-400 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> Precaución</span>}
                                  {goalPreferred && <span className="text-[8px] bg-emerald-600/30 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Recomendado</span>}
                                </div>
                                <div className="flex gap-3 mt-1 text-[10px]">
                                  <span className="text-neutral-400">P: <strong className="text-white">{food.proteinPer100g}g</strong></span>
                                  <span className="text-neutral-400">C: <strong className="text-white">{food.carbsPer100g}g</strong></span>
                                  <span className="text-neutral-400">G: <strong className="text-white">{food.fatPer100g}g</strong></span>
                                  <span className="text-neutral-400">Fibra: <strong className="text-white">{food.fiberPer100g}g</strong></span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-xs font-extrabold text-white font-mono block">{food.calsPer100g}</span>
                                <span className="text-[9px] text-neutral-500">kcal/100g</span>
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                              <div className="text-neutral-400 leading-snug">
                                <strong className="text-neutral-300">Para el cliente:</strong> {food.clientNote}
                              </div>
                              <div className={`leading-snug ${goalConflict ? 'text-red-400' : 'text-emerald-400/80'}`}>
                                <strong className={goalConflict ? 'text-red-300' : 'text-emerald-300'}>Para el entrenador:</strong> {food.trainerNote}
                              </div>
                            </div>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-950 border border-neutral-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            
            <div className="bg-neutral-900 px-5 py-4 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block">Regla de Tres Nutricional</span>
                <h3 className="text-base font-bold text-white">Sustituir: {substitutingItem.item.currentName}</h3>
              </div>
              <button 
                onClick={() => setSubstitutingItem(null)}
                className="text-neutral-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-neutral-300 leading-relaxed">
                Selecciona la alternativa que deseas consumir. El sistema calculará automáticamente los gramos necesarios para aportar los mismos macronutrientes del alimento propuesto originalmente (<strong className="text-white">{substitutingItem.item.amountGrams}g</strong>).
              </p>

              <div className="space-y-2">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Opciones Disponibles:</span>
                
                {professionalFoods.filter((f) => {
                  if (substitutingItem.item.category === 'carb') return ['carb', 'fruit'].includes(f.category);
                  if (substitutingItem.item.category === 'protein') return ['protein', 'dairy'].includes(f.category);
                  if (substitutingItem.item.category === 'fat') return ['fat', 'snack'].includes(f.category);
                  return f.category === substitutingItem.item.category;
                }).map((subFood, sIdx) => {
                  // Previsualizar el cálculo de equivalencia para transparencia
                  let previewGrams = substitutingItem.item.amountGrams;
                  if (subFood.category === 'carb' || subFood.category === 'fruit') {
                    const origCarbs = (substitutingItem.item.amountGrams * substitutingItem.item.baseCarbsPer100g) / 100;
                    previewGrams = Math.round((origCarbs * 100) / subFood.carbsPer100g);
                  } else {
                    const origCals = (substitutingItem.item.amountGrams * substitutingItem.item.baseCalsPer100g) / 100;
                    previewGrams = Math.round((origCals * 100) / subFood.calsPer100g);
                  }
                  if (isNaN(previewGrams) || previewGrams < 10) previewGrams = 50;
                  const goalConflict = subFood.avoidIfGoalIncludes?.some((word) => goal.toLowerCase().includes(word));

                  return (
                    <div 
                      key={sIdx}
                      onClick={() => handlePerformSubstitution(subFood)}
                      className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 cursor-pointer transition-all group"
                    >
                      <div>
                        <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors block">
                          {subFood.name}
                        </span>
                        <span className="text-[10px] text-neutral-500 block">
                          Aporta {subFood.category === 'carb' || subFood.category === 'fruit' ? `${subFood.carbsPer100g}g de Carbs` : `${subFood.calsPer100g} Kcal`} por cada 100g
                        </span>
                        <span className="text-[10px] text-neutral-400 block mt-1 max-w-xs leading-snug">
                          Cliente: {subFood.clientNote}
                        </span>
                        <span className={`text-[10px] block mt-1 max-w-xs leading-snug ${goalConflict ? 'text-red-400' : 'text-emerald-400'}`}>
                          Entrenador: {goalConflict ? 'Precaución: ' : ''}{subFood.trainerNote}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-extrabold text-amber-400 block font-mono">
                          Consumir: {previewGrams}g
                        </span>
                        <span className="text-[9px] text-neutral-500 block">Equivalencia exacta</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-neutral-900/60 px-5 py-3 border-t border-neutral-800 text-right">
              <button
                onClick={() => setSubstitutingItem(null)}
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
