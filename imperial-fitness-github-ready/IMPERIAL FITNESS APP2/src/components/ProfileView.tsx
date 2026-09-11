import React, { useEffect, useRef, useState } from 'react';
import { ZoomableAvatar } from './ZoomableAvatar';
import { Camera, KeyRound, Loader2, Save, ShieldCheck, User } from 'lucide-react';
import { ClientProfile } from '../data/mockData';
import { uploadAvatarToApi } from '../services/mediaService';
import { changePasswordInApi, updateUserProfileInApi } from '../services/userService';

interface ProfileViewProps {
  currentUser: ClientProfile;
  onAvatarUpdated: (avatarUrl: string) => void;
  onProfileUpdated?: (profile: ClientProfile) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onAvatarUpdated, onProfileUpdated }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [goal, setGoal] = useState(currentUser.goal || '');
  const [weight, setWeight] = useState(currentUser.weight ? String(currentUser.weight) : '');
  const [height, setHeight] = useState(currentUser.height ? String(currentUser.height) : '');
  const [age, setAge] = useState(currentUser.age ? String(currentUser.age) : '');
  const [gender, setGender] = useState<'M' | 'F' | ''>(currentUser.gender || '');
  const [activityLevel, setActivityLevel] = useState<NonNullable<ClientProfile['activityLevel']> | ''>(currentUser.activityLevel || '');
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(currentUser.workoutsPerWeek !== undefined ? String(currentUser.workoutsPerWeek) : '');
  const [averageDailySteps, setAverageDailySteps] = useState(currentUser.averageDailySteps !== undefined ? String(currentUser.averageDailySteps) : '');
  const [occupationActivity, setOccupationActivity] = useState<ClientProfile['occupationActivity'] | ''>(currentUser.occupationActivity || '');
  const [eatingPattern, setEatingPattern] = useState<ClientProfile['eatingPattern'] | ''>(currentUser.eatingPattern || '');
  const [dietaryPreferences, setDietaryPreferences] = useState(currentUser.dietaryPreferences || '');
  const [excludedFoods, setExcludedFoods] = useState(currentUser.excludedFoods || '');
  const [foodAllergies, setFoodAllergies] = useState(currentUser.foodAllergies || '');
  const [foodIntolerances, setFoodIntolerances] = useState(currentUser.foodIntolerances || '');
  const [medicalConditions, setMedicalConditions] = useState(currentUser.medicalConditions || '');
  const [medications, setMedications] = useState(currentUser.medications || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    setName(currentUser.name);
    setEmail(currentUser.email);
    setGoal(currentUser.goal || '');
    setWeight(currentUser.weight ? String(currentUser.weight) : '');
    setHeight(currentUser.height ? String(currentUser.height) : '');
    setAge(currentUser.age ? String(currentUser.age) : '');
    setGender(currentUser.gender || '');
    setActivityLevel(currentUser.activityLevel || '');
    setWorkoutsPerWeek(currentUser.workoutsPerWeek !== undefined ? String(currentUser.workoutsPerWeek) : '');
    setAverageDailySteps(currentUser.averageDailySteps !== undefined ? String(currentUser.averageDailySteps) : '');
    setOccupationActivity(currentUser.occupationActivity || '');
    setEatingPattern(currentUser.eatingPattern || '');
    setDietaryPreferences(currentUser.dietaryPreferences || '');
    setExcludedFoods(currentUser.excludedFoods || '');
    setFoodAllergies(currentUser.foodAllergies || '');
    setFoodIntolerances(currentUser.foodIntolerances || '');
    setMedicalConditions(currentUser.medicalConditions || '');
    setMedications(currentUser.medications || '');
  }, [currentUser]);

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMsg('Formato no permitido. Usa JPG, PNG o WEBP.');
      return;
    }
    setIsUploading(true);
    setMsg('');
    try {
      const avatarUrl = await uploadAvatarToApi(currentUser.id, file);
      onAvatarUpdated(avatarUrl);
      setMsg('Foto de perfil actualizada correctamente.');
    } catch {
      setMsg('No se pudo subir la foto. Verifica tu sesión o intenta nuevamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activityMap: Record<string, 'sedentary' | 'light' | 'moderate' | 'very_active' | 'athlete'> = {
        Sedentario: 'sedentary', Ligero: 'light', Moderado: 'moderate', Intenso: 'very_active', Atleta: 'athlete',
      };
      const updated = await updateUserProfileInApi(currentUser.id, {
        name,
        email,
        goal,
        weight: weight ? Number(weight) : undefined,
        height: height ? Number(height) : undefined,
        age: age ? Number(age) : undefined,
        gender: gender || undefined,
        activity_level: activityMap[activityLevel],
        workouts_per_week: workoutsPerWeek ? Number(workoutsPerWeek) : undefined,
        average_daily_steps: averageDailySteps ? Number(averageDailySteps) : undefined,
        occupation_activity: occupationActivity || undefined,
        eating_pattern: eatingPattern || undefined,
        dietary_preferences: dietaryPreferences,
        excluded_foods: excludedFoods,
        food_allergies: foodAllergies,
        food_intolerances: foodIntolerances,
        medical_conditions: medicalConditions,
        medications,
      });
      onProfileUpdated?.(updated);
      setMsg('Perfil actualizado correctamente.');
    } catch {
      setMsg('No se pudo actualizar el perfil. Revisa correo duplicado o permisos.');
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await changePasswordInApi(currentUser.id, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setMsg('Contraseña actualizada. Por seguridad, vuelve a iniciar sesión si el sistema te lo solicita.');
    } catch {
      setMsg('No se pudo cambiar la contraseña. Verifica tu contraseña actual.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900 to-black p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-900/60 bg-red-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400 mb-3">
          <User className="w-3.5 h-3.5" /> Perfil personal
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Tu cuenta Imperial Fitness</h1>
        <p className="text-sm text-neutral-400 mt-2">Actualiza tus datos personales, foto de perfil y contraseña de forma segura.</p>
      </div>

      {msg && <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <div className="text-center">
            <ZoomableAvatar src={currentUser.avatar} alt={currentUser.name} className="h-40 w-40 rounded-2xl" buttonClassName="mx-auto" />
            <span className="text-xs font-bold text-white block mt-3">{currentUser.name}</span>
            <span className="text-[10px] text-neutral-500 uppercase block">{currentUser.role}</span>
          </div>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
            className={`mt-5 min-h-[150px] cursor-pointer rounded-2xl border-2 border-dashed p-5 flex flex-col items-center justify-center text-center transition-all ${isDragging ? 'border-red-500 bg-red-950/20' : 'border-neutral-700 bg-neutral-900/40 hover:border-red-700'}`}
          >
            {isUploading ? <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-3" /> : <Camera className="w-8 h-8 text-red-500 mb-3" />}
            <span className="text-sm font-bold text-white">{isUploading ? 'Subiendo imagen...' : 'Cambiar foto/avatar'}</span>
            <span className="text-xs text-neutral-500 mt-1">JPG, PNG o WEBP.</span>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={saveProfile} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2"><Save className="w-4 h-4 text-red-500" /><h2 className="text-sm font-bold text-white uppercase tracking-wider">Datos de cuenta</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Nombre</label><input value={name} onChange={e => setName(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
              <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Correo</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 space-y-3">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Datos para cálculo nutricional</span>
                <p className="text-[11px] text-neutral-500 mt-1">La app no completará datos faltantes. Peso, estatura, edad, sexo, actividad y objetivo son necesarios para calcular calorías.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Peso kg</label><input type="number" min="20" max="300" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
                <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Estatura cm</label><input type="number" min="120" max="250" value={height} onChange={e => setHeight(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
                <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Edad</label><input type="number" min="10" max="100" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
                <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Sexo fórmula</label><select value={gender} onChange={e => setGender(e.target.value as 'M' | 'F' | '')} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white"><option value="">Seleccionar</option><option value="M">Masculino</option><option value="F">Femenino</option></select></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Actividad</label><select value={activityLevel} onChange={e => setActivityLevel(e.target.value as NonNullable<ClientProfile['activityLevel']> | '')} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white"><option value="">Seleccionar</option><option>Sedentario</option><option>Ligero</option><option>Moderado</option><option>Intenso</option><option>Atleta</option></select></div>
                <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Entrenos/semana</label><input type="number" min="0" max="14" value={workoutsPerWeek} onChange={e => setWorkoutsPerWeek(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
                <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Pasos/día</label><input type="number" min="0" max="100000" step="500" value={averageDailySteps} onChange={e => setAverageDailySteps(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
                <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Trabajo diario</label><select value={occupationActivity} onChange={e => setOccupationActivity(e.target.value as typeof occupationActivity)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white"><option value="">Seleccionar</option><option value="sedentary">Sentado</option><option value="light">Algo activo</option><option value="active">Activo</option><option value="physical">Trabajo físico</option></select></div>
              </div>
            </div>
            {currentUser.role === 'client' && (
              <div className="rounded-xl border border-amber-900/45 bg-amber-950/10 p-4 space-y-3">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Seguridad y preferencias alimentarias</span>
                  <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">Estos datos se usan para revisión humana antes de publicar planes. Si cambias alergias, intolerancias, condiciones o medicamentos, la aprobación nutricional anterior se invalida automáticamente.</p>
                  {(foodAllergies || foodIntolerances || medicalConditions || medications) && (
                    <p className={`mt-2 text-[10px] font-bold ${currentUser.nutritionReviewedAt ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {currentUser.nutritionReviewedAt ? `Revisión del coach registrada: ${new Date(currentUser.nutritionReviewedAt).toLocaleDateString('es-CO')}` : 'Revisión profesional pendiente antes de publicar un nuevo plan.'}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Patrón alimentario</label><select value={eatingPattern} onChange={e => setEatingPattern(e.target.value as ClientProfile['eatingPattern'] | '')} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white"><option value="">Seleccionar</option><option value="omnivore">Omnívoro</option><option value="flexitarian">Flexitariano</option><option value="pescatarian">Pescetariano</option><option value="vegetarian">Vegetariano</option><option value="vegan">Vegano</option></select></div>
                  <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Preferencias</label><input value={dietaryPreferences} onChange={e => setDietaryPreferences(e.target.value)} placeholder="Ej: comidas simples, cocina colombiana" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
                  <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Alimentos que no consumes</label><input value={excludedFoods} onChange={e => setExcludedFoods(e.target.value)} placeholder="Ej: hígado, atún" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
                  <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Alergias</label><input value={foodAllergies} onChange={e => setFoodAllergies(e.target.value)} placeholder="Ej: maní, camarón" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
                  <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Intolerancias</label><input value={foodIntolerances} onChange={e => setFoodIntolerances(e.target.value)} placeholder="Ej: lactosa" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
                  <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Condición médica relevante</label><input value={medicalConditions} onChange={e => setMedicalConditions(e.target.value)} placeholder="Solo lo relevante para nutrición/ejercicio" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
                  <div className="md:col-span-2"><label className="text-[10px] text-neutral-400 uppercase block mb-1">Medicamentos relevantes</label><input value={medications} onChange={e => setMedications(e.target.value)} placeholder="Registra solo medicamentos que el equipo deba considerar" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
                </div>
              </div>
            )}
            <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Objetivo</label><select value={goal} onChange={e => setGoal(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white"><option value="">Seleccionar objetivo</option><option value="Pérdida de grasa">Pérdida de grasa</option><option value="Mantenimiento">Mantenimiento</option><option value="Recomposición corporal">Recomposición corporal</option><option value="Ganancia muscular">Ganancia muscular</option><option value="Fuerza">Fuerza</option></select></div>
            <button className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg">Guardar perfil</button>
          </form>

          <form onSubmit={changePassword} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2"><KeyRound className="w-4 h-4 text-amber-500" /><h2 className="text-sm font-bold text-white uppercase tracking-wider">Seguridad y contraseña</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Contraseña actual</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
              <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Nueva contraseña</label><input type="password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
            </div>
            <button disabled={!currentPassword || newPassword.length < 8} className="bg-neutral-100 hover:bg-white disabled:bg-neutral-800 disabled:text-neutral-600 text-black text-xs font-bold px-4 py-2 rounded-lg">Actualizar contraseña</button>
          </form>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[11px] text-emerald-200 flex gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Avatar, perfil y contraseña quedan protegidos por permisos: cada usuario gestiona su perfil; el administrador conserva control total.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
