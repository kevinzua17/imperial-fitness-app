import React, { useEffect, useRef, useState } from 'react';
import { ZoomableAvatar } from './ZoomableAvatar';
import { 
  TrendingUp, 
  Users, 
  Coins, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Sparkles, 
  ArrowRight,
  Dumbbell,
  Utensils,
  Settings,
  HelpCircle
} from 'lucide-react';
import { ClientProfile, DietPlan, WorkoutRoutine } from '../data/mockData';
import { BrandingSettings, getLogoFromApi, uploadLoginBackgroundToApi, uploadLogoToApi, updateBrandingInApi } from '../services/mediaService';
import { getStatsSummaryFromApi, StatsSummary } from '../services/statsService';
import { RetentionAlertApi, generateRetentionAlertsInApi, getRetentionSetupStatusFromApi, listRetentionAlertsFromApi, resolveRetentionAlertInApi } from '../services/retentionService';
import { GamificationSummaryCard } from './GamificationSummaryCard';

interface DashboardViewProps {
  currentUser: ClientProfile;
  users: ClientProfile[];
  diets: DietPlan[];
  routines: WorkoutRoutine[];
  onNavigateTab: (tab: string) => void;
  branding?: BrandingSettings | null;
  onBrandingUpdated?: (branding: BrandingSettings) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  users,
  diets,
  routines,
  onNavigateTab,
  branding,
  onBrandingUpdated
}) => {
  // Estadísticas
  const activeClients = users.filter(u => u.role === 'client');
  const trainersCount = users.filter(u => u.role === 'trainer').length;
  const totalTokensCirculating = users.reduce((acc, u) => acc + (u.tokens || 0), 0);
  // Mis rutinas / dietas si el usuario es cliente
  const myRoutine = routines.find(r => r.clientId === currentUser.id);
  const myDiet = diets.find(d => d.clientId === currentUser.id);
  const firstRoutineDay = myRoutine?.days?.[0];
  const clientHeightMeters = currentUser.height ? currentUser.height / 100 : 0;
  const clientBmi = currentUser.weight && clientHeightMeters > 0
    ? Math.round((currentUser.weight / (clientHeightMeters * clientHeightMeters)) * 10) / 10
    : 0;
  const clientsWithoutRoutine = activeClients.filter(client => !routines.some(routine => routine.clientId === client.id)).length;
  const clientsWithoutDiet = activeClients.filter(client => !diets.some(diet => diet.clientId === client.id)).length;
  const clientsMissingBodyData = activeClients.filter(client => !client.height || !client.weight || !client.age || !client.gender).length;
  const clientsWithLowAttendance = activeClients.filter(client => (client.attendanceRate || 0) < 70 || client.retentionRisk === 'Alto').length;

  // Alumnos asignados si el usuario es entrenador
  const myAssignedClients = users.filter(u => u.assignedTrainerId === currentUser.id);

  // Estado local para personalizar el Logo y Nombre del Gimnasio en vivo
  const [gymName, setGymName] = useState(branding?.gym_name || 'IMPERIAL FITNESS');
  const [gymLogoUrl, setGymLogoUrl] = useState(branding?.gym_logo_url || '/logo-imperial-fitness.png');
  const [loginBackgroundUrl, setLoginBackgroundUrl] = useState(branding?.login_background_url || '');
  const [isEditingBranding, setIsEditingBranding] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [retentionAlerts, setRetentionAlerts] = useState<RetentionAlertApi[]>([]);
  const [retentionMessage, setRetentionMessage] = useState('');
  const [retentionReady, setRetentionReady] = useState(true);
  const [isLoadingRetention, setIsLoadingRetention] = useState(false);
  const [isGeneratingRetention, setIsGeneratingRetention] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const loginBackgroundInputRef = useRef<HTMLInputElement | null>(null);

  const loadRetentionAlerts = async () => {
    if (currentUser.role === 'client') return;
    setIsLoadingRetention(true);
    try {
      const setup = await getRetentionSetupStatusFromApi();
      setRetentionReady(setup.ready);
      if (!setup.ready) {
        setRetentionAlerts([]);
        setRetentionMessage('Seguimiento pendiente de configuración interna.');
        return;
      }
      const alerts = await listRetentionAlertsFromApi();
      setRetentionAlerts(alerts);
      setRetentionMessage('');
    } catch {
      setRetentionAlerts([]);
      setRetentionReady(false);
      setRetentionMessage('Seguimiento no disponible en este momento. Intenta nuevamente en unos minutos.');
    } finally {
      setIsLoadingRetention(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let timer: number | undefined;

    getStatsSummaryFromApi()
      .then(value => {
        if (mounted) setStats(value);
      })
      .catch(() => {
        if (mounted) setStats(null);
      });

    // Las cargas menos urgentes se hacen después del primer render para que el usuario entre antes.
    timer = window.setTimeout(() => {
      if (!mounted) return;
      if (!branding?.gym_logo_url) {
        getLogoFromApi().then(value => {
          if (mounted) setGymLogoUrl(value);
        }).catch(() => undefined);
      }
      if (currentUser.role !== 'client') loadRetentionAlerts();
    }, currentUser.role === 'client' ? 1200 : 650);

    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [currentUser.id, currentUser.role]);

  useEffect(() => {
    if (branding) {
      setGymName(branding.gym_name);
      setGymLogoUrl(branding.gym_logo_url);
      setLoginBackgroundUrl(branding.login_background_url);
    }
  }, [branding]);

  const handleLogoUpload = async (file?: File) => {
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const logoUrl = await uploadLogoToApi(file);
      setGymLogoUrl(logoUrl);
      if (branding) onBrandingUpdated?.({ ...branding, gym_logo_url: logoUrl });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleLoginBackgroundUpload = async (file?: File) => {
    if (!file) return;
    setIsUploadingBackground(true);
    try {
      const backgroundUrl = await uploadLoginBackgroundToApi(file);
      setLoginBackgroundUrl(backgroundUrl);
      if (branding) onBrandingUpdated?.({ ...branding, login_background_url: backgroundUrl });
    } finally {
      setIsUploadingBackground(false);
    }
  };

  const handleSaveBrandingText = async () => {
    try {
      const updated = await updateBrandingInApi({ gym_name: gymName });
      onBrandingUpdated?.(updated);
    } catch {
      // Keep local preview if plataforma is unavailable.
    }
  };

  const handleGenerateRetentionAlerts = async () => {
    if (!retentionReady) {
      setRetentionMessage('Antes de generar alertas, completa la configuración interna del seguimiento.');
      return;
    }
    setIsGeneratingRetention(true);
    try {
      const created = await generateRetentionAlertsInApi();
      const all = await listRetentionAlertsFromApi();
      setRetentionAlerts(all);
      setRetentionMessage(created.length ? `${created.length} alerta(s) nueva(s) generada(s).` : 'No se generaron alertas nuevas.');
    } catch {
      setRetentionMessage('No se pudo generar alertas en este momento. Intenta nuevamente.');
    } finally {
      setIsGeneratingRetention(false);
    }
  };

  const handleResolveRetentionAlert = async (alertId: number) => {
    try {
      await resolveRetentionAlertInApi(alertId);
      setRetentionAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch {
      setRetentionMessage('No se pudo resolver la alerta.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
      
      {/* HEADER PREMIUM & PERSONALIZADOR DE BRANDING */}
      <div className="relative bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-6 overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-red-950/20 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 z-10 relative">
          
          <div className="flex items-center gap-4">
            {/* Logo Personalizable */}
            <div className="relative group shrink-0">
              <img 
                src={gymLogoUrl} 
                alt="Gym Logo" 
                className="w-16 h-16 rounded-2xl object-contain bg-white border-2 border-red-600 shadow-md"
              />
              {currentUser.role === 'admin' && (
                <button 
                  onClick={() => setIsEditingBranding(!isEditingBranding)}
                  className="absolute inset-0 bg-black/70 text-[9px] text-white font-bold rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-center p-1"
                >
                  Cambiar Logo
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">
                  Sede Central &bull; Seguimiento Activo
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {gymName} <span className="text-red-500 font-light">| Progreso</span>
              </h1>
              <p className="text-xs text-neutral-400 mt-1 max-w-xl font-light">
                {currentUser.role === 'admin' && 'Monitorea las métricas del negocio, asignación de especialistas, retención activa y estado de los clientes.'}
                {currentUser.role === 'trainer' && 'Supervisa el progreso de tus alumnos asignados y prescribe porciones y cargas precisas.'}
                {currentUser.role === 'client' && `Nivel: ${currentUser.experienceLevel} | Plan: ${currentUser.plan} | Racha actual: ${currentUser.streak || 0} días consecutivos.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setIsEditingBranding(!isEditingBranding)}
                className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5 text-red-500" /> Personalizar Gym
              </button>
            )}

            {currentUser.role === 'client' && (
              <button
                onClick={() => onNavigateTab('personal_plan')}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-red-950/50 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Ver Plan Personalizado
              </button>
            )}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => onNavigateTab('finance')}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4 text-white" /> Panel Financiero
              </button>
            )}
            {currentUser.role === 'trainer' && (
              <button
                onClick={() => onNavigateTab('personal_plan')}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
              >
                <Utensils className="w-4 h-4" /> Prescribir Plan
              </button>
            )}
          </div>
        </div>

        {/* Panel Desplegable para Editar Logo y Nombre del Gym */}
        {isEditingBranding && currentUser.role === 'admin' && (
          <div className="mt-4 pt-4 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/40 p-4 rounded-xl animate-fade-in">
            <div>
              <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">Nombre del Gimnasio</label>
              <input 
                type="text" 
                value={gymName} 
                onChange={(e) => setGymName(e.target.value)}
                onBlur={handleSaveBrandingText}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">Logo del gimnasio</label>
              <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleLogoUpload(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white hover:border-red-600 transition-colors text-left disabled:opacity-50"
              >
                {isUploadingLogo ? 'Subiendo logo...' : 'Seleccionar desde ordenador o galería'}
              </button>
            </div>
            <div>
              <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">Imagen de fondo del login</label>
              <input ref={loginBackgroundInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleLoginBackgroundUpload(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => loginBackgroundInputRef.current?.click()}
                disabled={isUploadingBackground}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white hover:border-red-600 transition-colors text-left disabled:opacity-50"
              >
                {isUploadingBackground ? 'Subiendo imagen...' : 'Cambiar imagen del login'}
              </button>
              {loginBackgroundUrl && <span className="block text-[9px] text-neutral-500 mt-1 truncate">Actual: {loginBackgroundUrl}</span>}
            </div>
            <div className="col-span-full text-right">
              <button 
                onClick={() => setIsEditingBranding(false)}
                className="bg-neutral-800 hover:bg-neutral-700 text-[10px] text-white px-3 py-1 rounded font-bold"
              >
                Cerrar panel
              </button>
            </div>
          </div>
        )}

        {/* Indicadores rápidos biométricos si es cliente */}
        {currentUser.role === 'client' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-neutral-800/80">
            <div>
              <span className="text-[10px] text-neutral-500 uppercase block font-medium">Grasa Corporal</span>
              <span className="text-lg font-bold text-white">{currentUser.bodyFat ? `${currentUser.bodyFat}%` : 'Sin dato'}</span>
              <div className="w-full bg-neutral-800 h-1 rounded-full mt-1">
                <div className="bg-red-500 h-1 rounded-full" style={{ width: `${Math.min(100, currentUser.bodyFat || 0)}%` }} />
              </div>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 uppercase block font-medium">Masa Muscular</span>
              <span className="text-lg font-bold text-white">{currentUser.muscleMass ? `${currentUser.muscleMass} kg` : 'Sin dato'}</span>
              <div className="w-full bg-neutral-800 h-1 rounded-full mt-1">
                <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${Math.min(100, currentUser.muscleMass || 0)}%` }} />
              </div>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 uppercase block font-medium">Agua Corporal</span>
              <span className="text-lg font-bold text-white">{currentUser.waterPercent ? `${currentUser.waterPercent}%` : 'Sin dato'}</span>
              <div className="w-full bg-neutral-800 h-1 rounded-full mt-1">
                <div className="bg-sky-500 h-1 rounded-full" style={{ width: `${Math.min(100, currentUser.waterPercent || 0)}%` }} />
              </div>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 uppercase block font-medium">Asistencia Promedio</span>
              <span className="text-lg font-bold text-white">{currentUser.attendanceRate}%</span>
              <div className="w-full bg-neutral-800 h-1 rounded-full mt-1">
                <div className={`h-1 rounded-full ${currentUser.attendanceRate > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${currentUser.attendanceRate}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>


      <GamificationSummaryCard
        currentUser={currentUser}
        users={users}
        diets={diets}
        routines={routines}
        onNavigateTab={onNavigateTab}
      />

      {currentUser.role === 'client' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-red-900/50 bg-gradient-to-br from-red-950/40 via-neutral-950 to-neutral-950 p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell className="w-5 h-5 text-red-400" />
              <span className="text-[11px] uppercase tracking-[0.18em] text-red-200 font-black">Entreno de hoy</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {firstRoutineDay ? firstRoutineDay.focus : 'Rutina pendiente'}
            </h3>
            <p className="mt-2 text-sm text-neutral-300 leading-relaxed">
              {firstRoutineDay
                ? `${firstRoutineDay.exercises.length} ejercicios listos. Entra al plan para ver series, repeticiones, imágenes e indicaciones.`
                : 'Aún no tienes rutina asignada. Solicita al entrenador tu plan de fuerza.'}
            </p>
            <button
              onClick={() => onNavigateTab('personal_plan')}
              className="mt-4 w-full rounded-2xl bg-red-600 hover:bg-red-500 px-4 py-3 text-sm font-black text-white"
            >
              Ver mi rutina
            </button>
          </div>

          <div className="rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-yellow-950/30 via-neutral-950 to-neutral-950 p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-yellow-300" />
              <span className="text-[11px] uppercase tracking-[0.18em] text-yellow-100 font-black">Timer imperial</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">Conteo fuerte 3, 2, 1</h3>
            <p className="mt-2 text-sm text-neutral-300 leading-relaxed">
              Usa el timer para distinguir claramente entreno y descanso con alerta sonora fuerte antes de cada cambio.
            </p>
            <button
              onClick={() => onNavigateTab('timer')}
              className="mt-4 w-full rounded-2xl bg-yellow-400 hover:bg-yellow-300 px-4 py-3 text-sm font-black text-black"
            >
              Abrir timer
            </button>
          </div>

          <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-neutral-950 to-neutral-950 p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-emerald-300" />
              <span className="text-[11px] uppercase tracking-[0.18em] text-emerald-100 font-black">Medidas InBody</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 p-3">
                <span className="block text-[10px] text-neutral-500 uppercase font-bold">Peso</span>
                <strong className="text-xl text-white">{currentUser.weight || 0} kg</strong>
              </div>
              <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 p-3">
                <span className="block text-[10px] text-neutral-500 uppercase font-bold">IMC</span>
                <strong className="text-xl text-white">{clientBmi > 0 ? clientBmi : '—'}</strong>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('body_metrics')}
              className="mt-4 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-sm font-black text-white"
            >
              Actualizar medidas
            </button>
          </div>
        </div>
      )}

      {currentUser.role !== 'client' && (
        <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-4 sm:p-5 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <span className="text-[11px] uppercase tracking-[0.22em] text-red-400 font-black">Control general del gimnasio</span>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-1">Prioridades para dejar clientes listos</h3>
              <p className="text-sm text-neutral-400 mt-1">Vista rápida para revisar rutina, nutrición, datos corporales y riesgo antes del lanzamiento.</p>
            </div>
            <button
              onClick={() => onNavigateTab('clients')}
              className="rounded-2xl bg-red-600 hover:bg-red-500 px-5 py-3 text-sm font-black text-white"
            >
              Revisar clientes
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
              <span className="text-[10px] text-neutral-500 uppercase font-bold">Sin rutina</span>
              <strong className="block text-3xl text-white mt-1">{clientsWithoutRoutine}</strong>
              <button onClick={() => onNavigateTab('personal_plan')} className="mt-2 text-xs text-red-400 font-bold">Asignar plan →</button>
            </div>
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
              <span className="text-[10px] text-neutral-500 uppercase font-bold">Sin nutrición</span>
              <strong className="block text-3xl text-white mt-1">{clientsWithoutDiet}</strong>
              <button onClick={() => onNavigateTab('personal_plan')} className="mt-2 text-xs text-emerald-400 font-bold">Crear pauta →</button>
            </div>
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
              <span className="text-[10px] text-neutral-500 uppercase font-bold">Datos incompletos</span>
              <strong className="block text-3xl text-white mt-1">{clientsMissingBodyData}</strong>
              <button onClick={() => onNavigateTab('body_metrics')} className="mt-2 text-xs text-yellow-300 font-bold">Completar InBody →</button>
            </div>
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
              <span className="text-[10px] text-neutral-500 uppercase font-bold">Alerta de riesgo</span>
              <strong className="block text-3xl text-white mt-1">{clientsWithLowAttendance}</strong>
              <button onClick={() => onNavigateTab('clients')} className="mt-2 text-xs text-amber-400 font-bold">Hacer seguimiento →</button>
            </div>
          </div>
        </div>
      )}

      {/* GUÍA EXPLICATIVA DE OPCIONES SOLICITADA POR EL USUARIO */}
      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <span className="text-xs font-bold text-white block">Mapa completo del gimnasio</span>
            <span className="text-[11px] text-neutral-400 block">
              Explora las pestañas superiores para gestionar <strong className="text-neutral-300">Clientes</strong>, prescribir <strong className="text-neutral-300">Planes Personalizados</strong> con equivalencias en gramos, ver el <strong className="text-neutral-300">Muro Social</strong> o canjear <strong className="text-neutral-300">Recompensas</strong>.
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 px-2 py-1 rounded shrink-0">
          App Operativa 100% Humana
        </span>
      </div>

      {/* --- SECCIÓN: VISTA DE ADMINISTRADOR --- */}
      {currentUser.role === 'admin' && (
        <div className="space-y-6">
          {/* Tarjetas de Métricas SaaS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-all">
              <div className="flex justify-between items-start text-neutral-400 mb-2">
                <span className="text-xs font-medium">Clientes Activos</span>
                <Users className="w-4 h-4 text-sky-500" />
              </div>
              <div className="text-2xl font-black text-white">{stats?.clients_total ?? activeClients.length}</div>
              <p className="text-[10px] text-neutral-500 mt-1 font-medium">Dato real de usuarios activos</p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-all">
              <div className="flex justify-between items-start text-neutral-400 mb-2">
                <span className="text-xs font-medium">Planes Prescritos</span>
                <Utensils className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-white">{stats?.diet_plans_total ?? diets.length}</div>
              <p className="text-[10px] text-neutral-500 mt-1">Supervisados por Nutricionistas</p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-all">
              <div className="flex justify-between items-start text-neutral-400 mb-2">
                <span className="text-xs font-medium">Tokens Circulantes</span>
                <Coins className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-white">{totalTokensCirculating.toLocaleString()}</div>
              <p className="text-[10px] text-amber-500/80 mt-1">Sistema de recompensas activo</p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-all">
              <div className="flex justify-between items-start text-neutral-400 mb-2">
                <span className="text-xs font-medium">Asistencia Promedio</span>
                <Activity className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl font-black text-white">{stats?.workout_sets_total ?? 0}</div>
              <p className="text-[10px] text-neutral-400 mt-1">Series registradas</p>
            </div>

          </div>

          {/* Gráficas e Indicadores de Retención */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Barras de rendimiento general */}
            <div className="lg:col-span-2 bg-neutral-950 border border-neutral-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Evolución de Ingresos y Adherencia Nutricional
                </h3>
                <span className="text-[10px] bg-neutral-900 px-2 py-0.5 rounded text-neutral-400">Año Operativo</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400 font-light">Ingresos Recurrentes vs Presupuesto</span>
                  <span className="font-bold text-white">Sin datos suficientes</span>
                  </div>
                  <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-red-600 to-red-500 h-2 rounded-full transition-all" style={{ width: '0%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400 font-light">Cumplimiento de Porciones de Dieta</span>
                    <span className="font-bold text-neutral-400">Sin registros suficientes</span>
                  </div>
                  <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-2 rounded-full transition-all" style={{ width: '0%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400 font-light">Renovación de Pases Premium</span>
                    <span className="font-bold text-neutral-400">Sin datos suficientes</span>
                  </div>
                  <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-sky-600 to-sky-400 h-2 rounded-full transition-all" style={{ width: '0%' }} />
                  </div>
                </div>

                {/* Resumen de actividad de la comunidad */}
                <div className="pt-4 border-t border-neutral-900 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-neutral-900/50 rounded-lg">
                    <span className="block text-[10px] text-neutral-500">Nuevos Hoy</span>
                    <span className="text-sm font-bold text-white">{stats?.pending_users ?? 0}</span>
                  </div>
                  <div className="p-2 bg-neutral-900/50 rounded-lg">
                    <span className="block text-[10px] text-neutral-500">Conectados App</span>
                    <span className="text-sm font-bold text-emerald-400">{stats?.active_users ?? users.length} Usuarios</span>
                  </div>
                  <div className="p-2 bg-neutral-900/50 rounded-lg">
                    <span className="block text-[10px] text-neutral-500">Entrenadores en Sala</span>
                    <span className="text-sm font-bold text-white">{stats?.trainers_total ?? trainersCount} Especialistas</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Retención especializada */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Panel de Retención Predictiva
                  </h3>
                </div>
                <p className="text-xs text-neutral-400 mb-4 font-light">
                  Monitoreo de inasistencia crítica para asignar seguimientos y evitar bajas de suscripción.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={loadRetentionAlerts}
                    disabled={isLoadingRetention}
                    className="rounded-lg bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60 border border-neutral-700 px-3 py-2 text-xs font-bold text-white"
                  >
                    {isLoadingRetention ? 'Actualizando...' : 'Actualizar'}
                  </button>
                  <button
                    onClick={handleGenerateRetentionAlerts}
                    disabled={!retentionReady || isGeneratingRetention}
                    className="rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:border-neutral-700 border border-red-500/30 px-3 py-2 text-xs font-bold text-white"
                  >
                    {isGeneratingRetention ? 'Generando...' : 'Generar alertas'}
                  </button>
                </div>
                {retentionMessage && (
                  <p className={`text-[11px] mb-3 ${retentionReady ? 'text-neutral-400' : 'text-amber-300'}`}>
                    {retentionMessage}
                  </p>
                )}
                <div className="space-y-2">
                  {retentionAlerts.length > 0 ? retentionAlerts.map(alert => (
                    <div key={alert.id} className="rounded-xl border border-red-900/40 bg-red-950/10 p-3 text-left">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="text-xs font-bold text-white">{alert.client_name}</span>
                        <span className="text-[9px] uppercase text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">{alert.risk}</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">{alert.reason}</p>
                      <p className="text-[10px] text-amber-300 mt-1 leading-relaxed">{alert.suggested_action}</p>
                      <button onClick={() => handleResolveRetentionAlert(alert.id)} className="mt-2 text-[10px] text-emerald-400 hover:text-white font-bold">Marcar resuelta</button>
                    </div>
                  )) : (
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-center">
                      <CheckCircle2 className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                      <span className="text-xs font-bold text-neutral-300 block">Sin alertas reales registradas</span>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">Registra asistencias o genera alertas para ver riesgo real.</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('clients')}
                className="mt-4 w-full text-center text-xs text-neutral-500 hover:text-white transition-colors block pt-2 border-t border-neutral-900"
              >
                Ver todos los perfiles de clientes &rarr;
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- SECCIÓN: VISTA DE ENTRENADOR --- */}
      {currentUser.role === 'trainer' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <span className="text-xs text-neutral-400 block mb-1">Mis Alumnos Directos</span>
              <div className="text-2xl font-black text-white">{myAssignedClients.length}</div>
              <p className="text-[11px] text-neutral-500 mt-1">Con planes de seguimiento y equivalencias</p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <span className="text-xs text-neutral-400 block mb-1">Valoraciones de Progreso</span>
              <div className="text-2xl font-black text-amber-500">0 Programadas</div>
              <p className="text-[11px] text-neutral-500 mt-1">Sin evaluaciones registradas</p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <span className="text-xs text-neutral-400 block mb-1">Ajustes Nutricionales Realizados</span>
              <div className="text-2xl font-black text-emerald-400">{diets.length} Planes</div>
              <p className="text-[11px] text-neutral-500 mt-1">Gramos recalculados exitosamente</p>
            </div>

          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Alumnos Bajo Tu Tutela Personal
              </h3>
              <button 
                onClick={() => onNavigateTab('clients')}
                className="text-xs text-red-500 hover:underline font-semibold"
              >
                Ver Expedientes Completos
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAssignedClients.map(client => (
                <div key={client.id} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ZoomableAvatar src={client.avatar} alt={client.name} className="h-8 w-8 rounded-full" />
                      <div>
                        <span className="text-xs font-bold text-white block">{client.name}</span>
                        <span className="text-[10px] text-neutral-400 block">Enfoque: {client.goal || 'General'}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-[11px] text-neutral-400 pt-2 border-t border-neutral-800/80">
                      <div className="flex justify-between">
                        <span>Asistencia:</span>
                        <span className={client.attendanceRate > 80 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {client.attendanceRate}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nivel físico:</span>
                        <span className="text-neutral-300">{client.experienceLevel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Último entreno:</span>
                        <span className="text-neutral-300">{client.lastAttendance}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-800 flex gap-2">
                    <button
                      onClick={() => onNavigateTab('personal_plan')}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-semibold py-1.5 rounded transition-colors text-center"
                    >
                      Ajustar Dieta/Rutina
                    </button>
                    <button
                      onClick={() => onNavigateTab('chat')}
                      className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-[10px] font-semibold px-2.5 py-1.5 rounded transition-colors"
                    >
                      Chat
                    </button>
                  </div>
                </div>
              ))}

              {myAssignedClients.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-neutral-500">
                  No tienes alumnos directos asignados en este momento. Revisa la pestaña de Clientes.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SECCIÓN: VISTA DE CLIENTE --- */}
      {currentUser.role === 'client' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Columna Izquierda: Plan Prescrito */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Pauta de Nutrición Premium */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4 border-b border-neutral-900 pb-3">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Pauta Nutricional del Especialista
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-400 block font-mono">
                    {myDiet ? `${myDiet.baseCalories} Kcal` : 'Sin asignar'}
                  </span>
                  <span className="text-[9px] text-neutral-500 block">Calorías calculadas en vivo</span>
                </div>
              </div>

              {myDiet ? (
                <div>
                  <div className="flex gap-4 text-xs text-neutral-300 mb-4 bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800/50">
                    <span>Proteína Pura: <strong className="text-white font-mono">{myDiet.protein}g</strong></span>
                    <span>Carbohidratos: <strong className="text-white font-mono">{myDiet.carbs}g</strong></span>
                    <span>Grasas: <strong className="text-white font-mono">{myDiet.fat}g</strong></span>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-bold">
                      Vista Preliminar de Comidas (Con porciones en gramos):
                    </span>
                    
                    {myDiet.meals.slice(0, 2).map((meal, mIdx) => (
                      <div key={mIdx} className="bg-neutral-900/40 p-3 rounded-lg border border-neutral-850 text-xs">
                        <span className="font-bold text-white block mb-1.5 text-xs text-red-400">{meal.name}</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {meal.items.map((it, itIdx) => (
                            <div key={itIdx} className="bg-neutral-950 p-1.5 rounded border border-neutral-800 flex justify-between items-center text-[11px]">
                              <span className="text-neutral-300 truncate pr-1">
                                <strong className="text-white font-mono">{it.amountGrams}g</strong> {it.currentName}
                              </span>
                              <span className="text-[9px] text-amber-500 bg-amber-950/30 px-1 rounded shrink-0">
                                {it.category}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => onNavigateTab('personal_plan')}
                    className="mt-4 text-xs text-emerald-400 hover:text-white font-semibold flex items-center gap-1 block pt-2 border-t border-neutral-900 w-full justify-center text-center"
                  >
                    <span>Ver todas las comidas, suplementos y sustituir alimentos</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-neutral-500">
                  Tu expediente nutricional está en elaboración. Accede al Plan Personalizado para recalcular tus macros.
                </div>
              )}
            </div>

            {/* Rutina Asignada */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-red-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Bloque de Entrenamiento de Fuerza
                  </h3>
                </div>
                <span className="text-[10px] bg-neutral-900 text-neutral-400 px-2 py-0.5 rounded">
                  Francy Viviana
                </span>
              </div>

              {myRoutine ? (
                <div>
                  <h4 className="text-lg sm:text-xl font-black text-white mb-1 leading-tight">{myRoutine.title}</h4>
                  <p className="text-sm text-neutral-300 mb-4 leading-relaxed">{myRoutine.objective}</p>

                  <div className="space-y-3">
                    {myRoutine.days.slice(0, 2).map((d, idx) => (
                      <div key={idx} className="bg-neutral-900/70 border border-neutral-800 p-4 rounded-2xl">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-black text-red-300">{d.day}</span>
                          <span className="text-xs text-neutral-300 text-right">Enfoque: {d.focus}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {d.exercises.map((ex, exIdx) => (
                            <div key={exIdx} className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-sm flex flex-col justify-between min-h-[92px]">
                              <span className="font-black text-white block text-sm leading-tight">{ex.name}</span>
                              <span className="text-xs text-neutral-300 block font-mono mt-2">
                                {ex.sets} series &times; {ex.reps.split(' ')[0]}
                              </span>
                              {ex.notes && <span className="text-[11px] text-neutral-400 italic mt-2 block line-clamp-2 leading-relaxed">&bull; {ex.notes}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-900">
                    <span className="text-sm text-neutral-300 italic block leading-relaxed">
                      <strong className="text-white not-italic font-semibold">Instrucción del Entrenador:</strong> "{myRoutine.specialistAdvice}"
                    </span>
                    <button
                      onClick={() => onNavigateTab('personal_plan')}
                      className="mt-4 rounded-2xl bg-red-600 hover:bg-red-500 px-4 py-3 text-sm text-white font-black block text-center w-full"
                    >
                      Ver plan completo de gimnasio →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-neutral-400">
                  No tienes una rutina de fuerza programada.
                </div>
              )}
            </div>

          </div>

          {/* Columna Derecha: Soporte y Gamificación */}
          <div className="space-y-6">
            
            {/* Gamificación */}
            <div className="bg-gradient-to-b from-neutral-950 to-neutral-900 border border-neutral-800 rounded-xl p-5 text-center">
              <Coins className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-bounce" />
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 block font-medium">
                Tus Recompensas Acumuladas
              </span>
              <span className="text-3xl font-black text-amber-400 block my-1 font-mono">
                {currentUser.tokens.toLocaleString()}
              </span>
              <p className="text-[11px] text-neutral-400 mb-4">
                Canjeables por pases y productos en el Tonic Bar Imperial.
              </p>
              <button
                onClick={() => onNavigateTab('tokens')}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-xs text-amber-400 border border-amber-500/30 font-bold py-2 rounded-lg transition-colors"
              >
                Visitar Tienda de Recompensas
              </button>
            </div>

            {/* Reto mensual snippet */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Reto Comunitario</span>
                <Award className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-xs font-semibold text-neutral-200">
                Corte de Grasa Corporal Exclusivo
              </p>
              <div className="flex justify-between text-[10px] text-neutral-500 mt-2 mb-1">
                <span>Tu avance</span>
                <span className="text-white font-bold font-mono">65%</span>
              </div>
              <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, currentUser.muscleMass || 0)}%` }} />
              </div>
              <button
                onClick={() => onNavigateTab('challenges')}
                className="mt-3 text-[10px] text-neutral-400 hover:text-white block text-center w-full"
              >
                Ver ranking de alumnos &rarr;
              </button>
            </div>

            {/* Soporte Directo */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-left">
              <span className="text-[10px] text-neutral-500 uppercase block mb-1">Coach Personalizado</span>
              <div className="flex items-center gap-2.5">
                <img 
                  src="https://images.unsplash.com/photo-1594381898411-846e7d193883?w=150&auto=format&fit=crop&q=80" 
                  alt="Francy Viviana" 
                  className="w-9 h-9 rounded-full object-cover border border-neutral-700"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Francy Viviana Ruiz</span>
                  <span className="text-[10px] text-emerald-400 block">Master Trainer • Turno Mañana</span>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('chat')}
                className="mt-3 w-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold py-1.5 rounded transition-colors"
              >
                Abrir chat privado
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
