import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type {
  ClientProfile,
  DietPlan,
  WorkoutRoutine,
  SocialPost,
  ProgressPhoto,
} from './data/mockData';
import { LoginScreen } from './components/LoginScreen';
import { Navigation } from './components/Navigation';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { Loader2 } from 'lucide-react';
import { clearLocalSessionState, getCurrentUserFromApi, loginWithApi, logoutFromApi, registerClientWithApi } from './services/authService';
import { ApiError, bootstrapLegacyAccessToken, hasAuthSessionHint } from './services/api';
import { listUsersFromApi } from './services/userService';
import { getMyDietPlanFromApi, listDietPlansFromApi } from './services/nutritionService';
import { getMyMembershipFromApi } from './services/membershipService';
import { getMyAssignedRoutineFromApi, listAssignedRoutinesFromApi } from './services/routineService';
import { getBrandingFromApi } from './services/mediaService';
import type { BrandingSettings } from './services/mediaService';
import { safeGetItem, safeRemoveItem, safeSetItem } from './utils/safeStorage';
import { getAllowedModuleIds, normalizeRequestedModule } from './app/modules';

const DashboardView = lazy(() => import('./components/DashboardView').then(module => ({ default: module.DashboardView })));
const ClientsView = lazy(() => import('./components/ClientsView').then(module => ({ default: module.ClientsView })));
const PersonalPlanView = lazy(() => import('./components/PersonalPlanView').then(module => ({ default: module.PersonalPlanView })));
const ClientPlanView = lazy(() => import('./components/ClientPlanView').then(module => ({ default: module.ClientPlanView })));
const ProgressHubView = lazy(() => import('./components/ProgressHubView').then(module => ({ default: module.ProgressHubView })));
const CoachHubView = lazy(() => import('./components/CoachHubView').then(module => ({ default: module.CoachHubView })));
const AccountHubView = lazy(() => import('./components/AccountHubView').then(module => ({ default: module.AccountHubView })));
const StaffHubView = lazy(() => import('./components/StaffHubView').then(module => ({ default: module.StaffHubView })));
const SocialWallView = lazy(() => import('./components/SocialWallView').then(module => ({ default: module.SocialWallView })));
const TokenShopView = lazy(() => import('./components/TokenShopView').then(module => ({ default: module.TokenShopView })));
const ProgressAnalyticsView = lazy(() => import('./components/ProgressAnalyticsView').then(module => ({ default: module.ProgressAnalyticsView })));
const ChallengesView = lazy(() => import('./components/ChallengesView').then(module => ({ default: module.ChallengesView })));
const FinanceView = lazy(() => import('./components/FinanceView').then(module => ({ default: module.FinanceView })));
const ChatView = lazy(() => import('./components/ChatView').then(module => ({ default: module.ChatView })));
const ProgressPhotosView = lazy(() => import('./components/ProgressPhotosView').then(module => ({ default: module.ProgressPhotosView })));
const SyncHubView = lazy(() => import('./components/SyncHubView').then(module => ({ default: module.SyncHubView })));
const ImplementationRoadmapView = lazy(() => import('./components/ImplementationRoadmapView').then(module => ({ default: module.ImplementationRoadmapView })));
const UserManagementView = lazy(() => import('./components/UserManagementView').then(module => ({ default: module.UserManagementView })));
const SpecialistAssistantView = lazy(() => import('./components/SpecialistAssistantView').then(module => ({ default: module.SpecialistAssistantView })));
const ProfileView = lazy(() => import('./components/ProfileView').then(module => ({ default: module.ProfileView })));
const FriendsView = lazy(() => import('./components/FriendsView').then(module => ({ default: module.FriendsView })));
const TabataTimerView = lazy(() => import('./components/TabataTimerView').then(module => ({ default: module.TabataTimerView })));
const ExerciseLibraryView = lazy(() => import('./components/ExerciseLibraryView').then(module => ({ default: module.ExerciseLibraryView })));
const ImperialPathView = lazy(() => import('./components/ImperialPathView').then(module => ({ default: module.ImperialPathView })));
const DailyCheckinModal = lazy(() => import('./components/DailyCheckinModal').then(module => ({ default: module.DailyCheckinModal })));
const EvolutionHistoryView = lazy(() => import('./components/EvolutionHistoryView').then(module => ({ default: module.EvolutionHistoryView })));
const MembershipView = lazy(() => import('./components/MembershipView').then(module => ({ default: module.MembershipView })));
const RecoveryRequestsView = lazy(() => import('./components/RecoveryRequestsView').then(module => ({ default: module.RecoveryRequestsView })));

const LAST_ACTIVE_TAB_KEY = 'imperial_last_active_tab';
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

const resolvedTabForRole = (tab: string, role: ClientProfile['role']) => normalizeRequestedModule(tab, role);
const isTabAllowedForRole = (tab: string, role: ClientProfile['role']) => {
  const resolved = resolvedTabForRole(tab, role);
  return getAllowedModuleIds(role, DEV_MODE).includes(resolved);
};

const runWhenIdle = (callback: () => void | Promise<void>, delay = 250) => {
  const runner = () => {
    void callback();
  };
  const w = window as typeof window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === 'function') {
    return w.requestIdleCallback(runner, { timeout: Math.max(delay, 500) });
  }
  return window.setTimeout(runner, delay);
};

const ModuleLoading = () => (
  <div className="min-h-[55vh] flex items-center justify-center px-4">
    <div className="rounded-3xl border border-neutral-800 bg-neutral-950/90 p-6 text-center shadow-2xl max-w-xs">
      <Loader2 className="w-8 h-8 animate-spin text-red-500 mx-auto mb-3" />
      <p className="text-sm font-black text-white">Preparando tu panel</p>
      <p className="text-xs text-neutral-400 mt-1">Estamos preparando tu experiencia.</p>
    </div>
  </div>
);

export default function App() {
  // Estados Globales
  const [users, setUsers] = useState<ClientProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<ClientProfile | null>(null);

  // Secciones principales
  const [diets, setDiets] = useState<DietPlan[]>([]);
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [transitionMessage, setTransitionMessage] = useState('');
  const [sessionBootstrapping, setSessionBootstrapping] = useState(true);
  const [sessionRestoreError, setSessionRestoreError] = useState('');
  const [activeTab, setActiveTab] = useState<string>(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    return requestedTab || safeGetItem(LAST_ACTIVE_TAB_KEY) || 'dashboard';
  });
  const [selectedClientForPlanId, setSelectedClientForPlanId] = useState<string | undefined>(undefined);
  const [membershipRestricted, setMembershipRestricted] = useState(false);
  const routineMissingConfirmationsRef = useRef(0);
  const dietMissingConfirmationsRef = useRef(0);

  const switchTabSafely = (tab: string) => {
    if (!currentUser) {
      setActiveTab(tab);
      return;
    }

    const resolvedTab = resolvedTabForRole(tab, currentUser.role);
    if (currentUser.role === 'client' && membershipRestricted && resolvedTab !== 'profile') {
      setActiveTab('profile');
      return;
    }

    setActiveTab(isTabAllowedForRole(resolvedTab, currentUser.role) ? resolvedTab : 'dashboard');
  };

  const loadSecondaryDataForUser = useCallback((user: ClientProfile) => {
    runWhenIdle(async () => {
      if (user.role === 'client') {
        setUsers(prev => prev.some(item => item.id === user.id) ? prev : [user, ...prev]);

        const [membershipResult, dietResult, routineResult] = await Promise.allSettled([
          getMyMembershipFromApi(),
          getMyDietPlanFromApi(),
          getMyAssignedRoutineFromApi(),
        ]);

        if (membershipResult.status === 'fulfilled') {
          const membership = membershipResult.value;
          const restricted = Boolean(membership.restricted_access || membership.premium_modules_blocked);
          setMembershipRestricted(restricted);
          if (restricted) setActiveTab('profile');
        } else {
          setMembershipRestricted(false);
        }

        if (dietResult.status === 'fulfilled') {
          if (dietResult.value) {
            dietMissingConfirmationsRef.current = 0;
            setDiets([dietResult.value]);
          } else {
            dietMissingConfirmationsRef.current = Math.max(dietMissingConfirmationsRef.current, 2);
            setDiets(previous => previous.some(diet => diet.clientId === user.id) ? previous : []);
          }
        }
        if (routineResult.status === 'fulfilled') {
          const confirmedRoutine = routineResult.value || await getMyAssignedRoutineFromApi().catch(() => null);
          if (confirmedRoutine) {
            routineMissingConfirmationsRef.current = 0;
            setRoutines([confirmedRoutine]);
          } else {
            routineMissingConfirmationsRef.current = Math.max(routineMissingConfirmationsRef.current, 2);
            // Una carga inicial atrasada no puede borrar una rutina que el sondeo
            // ya confirmó para este mismo cliente.
            setRoutines(previous => previous.some(routine => routine.clientId === user.id) ? previous : []);
          }
        }
        return;
      }

      const usersResult = await Promise.allSettled([listUsersFromApi()]);
      const loadedUsers = usersResult[0];
      if (loadedUsers.status === 'fulfilled' && loadedUsers.value.length > 0) {
        setUsers(loadedUsers.value);
      } else {
        setUsers(prev => prev.some(item => item.id === user.id) ? prev : [user, ...prev]);
      }

      runWhenIdle(async () => {
        const [dietResult, routineResult] = await Promise.allSettled([
          listDietPlansFromApi(),
          listAssignedRoutinesFromApi(),
        ]);
        if (dietResult.status === 'fulfilled') setDiets(dietResult.value);
        if (routineResult.status === 'fulfilled') setRoutines(routineResult.value);
      }, 400);
    }, 100);
  }, []);

  const restoreSession = useCallback(async () => {
    setSessionBootstrapping(true);
    setSessionRestoreError('');
    bootstrapLegacyAccessToken();
    const expectedSession = hasAuthSessionHint();

    try {
      // Se intenta siempre la restauración. apiRequest renueva el access token
      // usando la cookie HttpOnly, incluso cuando localStorage no está disponible.
      const user = await getCurrentUserFromApi();
      setCurrentUser(user);
      setUsers(previous => [user, ...previous.filter(item => item.id !== user.id)]);
      setActiveTab(previous => isTabAllowedForRole(previous, user.role) ? resolvedTabForRole(previous, user.role) : 'dashboard');
      loadSecondaryDataForUser(user);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      const definitiveAuthFailure = status === 401 || status === 403;

      if (definitiveAuthFailure) {
        // Solo se limpia la sesión local cuando el servidor confirma que ya no
        // existe una sesión válida. Un 503, timeout o pérdida de internet no
        // revoca la cookie ni expulsa al usuario.
        clearLocalSessionState();
        setCurrentUser(null);
        setSessionRestoreError('');
      } else if (expectedSession) {
        setSessionRestoreError('No pudimos reconectar tu sesión todavía. Tus datos siguen protegidos; reintenta sin volver a iniciar sesión.');
      } else {
        // Visitante sin una sesión previa: una falla temporal no debe bloquear la
        // pantalla de ingreso. Puede iniciar sesión y reintentar normalmente.
        setSessionRestoreError('');
      }
    } finally {
      setSessionBootstrapping(false);
    }
  }, [loadSecondaryDataForUser]);

  const sessionRestoreStartedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    runWhenIdle(() => {
      getBrandingFromApi().then(value => {
        if (!cancelled) setBranding(value);
      }).catch(() => undefined);
    }, 150);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sessionRestoreStartedRef.current) return;
    sessionRestoreStartedRef.current = true;
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!currentUser || !isTabAllowedForRole(activeTab, currentUser.role)) return;
    safeSetItem(LAST_ACTIVE_TAB_KEY, activeTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [activeTab, currentUser?.id, currentUser?.role]);

  const refreshMembershipState = async () => {
    if (!currentUser || currentUser.role !== 'client') {
      setMembershipRestricted(false);
      return;
    }

    try {
      const membership = await getMyMembershipFromApi();
      const restricted = Boolean(membership.restricted_access || membership.premium_modules_blocked);
      setMembershipRestricted(restricted);
      if (restricted && resolvedTabForRole(activeTab, currentUser.role) !== 'profile') {
        setActiveTab('profile');
      }
    } catch {
      // No bloquea el acceso visual por una consulta lenta o temporalmente fallida.
      setMembershipRestricted(false);
    }
  };

  // Handlers de Autenticación
  const handleLogin = (user: ClientProfile) => {
    setCurrentUser(user);
    setUsers(prev => [user, ...prev.filter(item => item.id !== user.id)]);
    setActiveTab(previous => isTabAllowedForRole(previous, user.role) ? resolvedTabForRole(previous, user.role) : 'dashboard');
    loadSecondaryDataForUser(user);
  };

  const handleLoginWithCredentials = async (email: string, password: string) => {
    setTransitionMessage('Validando acceso seguro...');
    try {
      const apiUser = await loginWithApi(email, password);
      setCurrentUser(apiUser);
      setUsers(prev => [apiUser, ...prev.filter(item => item.id !== apiUser.id)]);
      setActiveTab(previous => isTabAllowedForRole(previous, apiUser.role) ? resolvedTabForRole(previous, apiUser.role) : 'dashboard');
      setTransitionMessage('');
      loadSecondaryDataForUser(apiUser);
    } finally {
      setTransitionMessage('');
    }
  };

  const handleRegister = (newUser: ClientProfile) => {
    setUsers([newUser, ...users]);
  };

  const handleRegisterClientWithCredentials = async (payload: { name: string; email: string; password: string; phone_number: string; whatsapp_opt_in?: number; goal?: string; weight?: number; height?: number; age?: number; gender?: 'M' | 'F' }) => {
    const pendingUser = await registerClientWithApi(payload);
    setUsers(prev => [pendingUser, ...prev.filter(u => u.id !== pendingUser.id)]);
  };

  const handleLogout = async () => {
    await logoutFromApi();
    setCurrentUser(null);
    setUsers([]);
    setDiets([]);
    setRoutines([]);
    routineMissingConfirmationsRef.current = 0;
    dietMissingConfirmationsRef.current = 0;
    setMembershipRestricted(false);
    safeRemoveItem(LAST_ACTIVE_TAB_KEY);
    setActiveTab('dashboard');
    const url = new URL(window.location.href);
    url.searchParams.delete('tab');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  // Handlers de estado
  const handleAddClient = (newClient: ClientProfile) => {
    setUsers([newClient, ...users]);
  };

  const handleSelectClientForPlan = (clientId: string) => {
    setSelectedClientForPlanId(clientId);
    switchTabSafely('personal_plan');
  };

  const handleGenerateDiet = (newDiet: DietPlan) => {
    setDiets(previous => [newDiet, ...previous.filter(diet => diet.clientId !== newDiet.clientId)]);
  };

  const handleGenerateRoutine = (newRoutine: WorkoutRoutine) => {
    setRoutines(previous => [newRoutine, ...previous.filter(routine => routine.clientId !== newRoutine.clientId)]);
  };

  const handleRemoveDiet = (clientId: string) => {
    setDiets(prev => prev.filter(d => d.clientId !== clientId));
  };

  const handleRemoveRoutine = (clientId: string) => {
    setRoutines(prev => prev.filter(r => r.clientId !== clientId));
  };

  // Fotos de Progreso
  const handleAddProgressPhoto = (newPhoto: ProgressPhoto, clientId?: string) => {
    if (!currentUser) return;
    
    const targetId = currentUser.role === 'client' ? currentUser.id : clientId || users.find(u => u.role === 'client')?.id || currentUser.id;
    
    setUsers(users.map(u => {
      if (u.id === targetId) {
        const currentList = u.progressPhotos || [];
        return { ...u, progressPhotos: [newPhoto, ...currentList] };
      }
      return u;
    }));

    if (currentUser.id === targetId) {
      setCurrentUser(prev => prev ? ({ ...prev, progressPhotos: [newPhoto, ...(prev.progressPhotos || [])] }) : null);
    }
  };

  // Muro Social
  const handleAddPost = (newPost: SocialPost) => {
    setPosts([newPost, ...posts]);
    if (currentUser) {
      handleUpdateTokens((currentUser.tokens || 0) + 100);
    }
  };

  const handleToggleLike = (postId: string) => {
    setPosts(posts.map(p => {
      if (p.id === postId) {
        const increment = p.likedByMe ? -1 : 1;
        return {
          ...p,
          likes: p.likes + increment,
          likedByMe: !p.likedByMe
        };
      }
      return p;
    }));
  };

  const handleAddComment = (postId: string, text: string) => {
    if (!currentUser) return;
    setPosts(posts.map(p => {
      if (p.id === postId) {
        const nComm = {
          id: `c-custom-${Date.now()}`,
          author: currentUser.name,
          text,
          timeAgo: 'Justo ahora'
        };
        return {
          ...p,
          commentsCount: p.commentsCount + 1,
          comments: [...p.comments, nComm]
        };
      }
      return p;
    }));
  };

  // Tokens
  const handleUpdateTokens = (newAmount: number) => {
    if (!currentUser) return;
    const clamped = Math.max(0, newAmount);
    const updatedMe = { ...currentUser, tokens: clamped };
    setCurrentUser(updatedMe);
    setUsers(users.map(u => u.id === currentUser.id ? updatedMe : u));
  };

  // Métricas Corporales
  const handleUpdateClientMetrics = (weight: number, fat: number, muscle: number, water?: number, height?: number, age?: number, gender?: 'M' | 'F', targetUserId?: string) => {
    if (!currentUser) return;
    const targetId = targetUserId || currentUser.id;

    const applyMetrics = (user: ClientProfile): ClientProfile => ({
      ...user,
      weight,
      bodyFat: fat,
      muscleMass: muscle,
      ...(water !== undefined ? { waterPercent: water } : {}),
      ...(height ? { height } : {}),
      ...(age ? { age } : {}),
      ...(gender ? { gender } : {}),
      streak: targetId === currentUser.id ? (user.streak || 0) + 1 : user.streak,
    });

    setUsers(prev => prev.map(user => user.id === targetId ? applyMetrics(user) : user));

    if (targetId === currentUser.id) {
      const updatedMe = applyMetrics(currentUser);
      setCurrentUser(updatedMe);
      handleUpdateTokens((updatedMe.tokens || 0) + 75);
    }
  };

  const handleAvatarUpdated = (avatarUrl: string) => {
    if (!currentUser) return;
    const updated = { ...currentUser, avatar: avatarUrl };
    setCurrentUser(updated);
    setUsers(prev => prev.map(user => user.id === updated.id ? updated : user));
  };

  const handleProfileUpdated = (profile: ClientProfile) => {
    setCurrentUser(profile);
    setUsers(prev => [profile, ...prev.filter(user => user.id !== profile.id)]);
  };

  useEffect(() => {
    if (!currentUser) return;
    const resolved = resolvedTabForRole(activeTab, currentUser.role);
    if (!isTabAllowedForRole(resolved, currentUser.role)) {
      setActiveTab('dashboard');
      return;
    }
    if (resolved !== activeTab) setActiveTab(resolved);
  }, [currentUser?.role, activeTab]);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role !== 'client') {
      setMembershipRestricted(false);
      return;
    }
    runWhenIdle(() => {
      refreshMembershipState();
    }, 500);
  }, [currentUser?.id, currentUser?.role]);


  useEffect(() => {
    if (!currentUser || currentUser.role !== 'client') return;

    routineMissingConfirmationsRef.current = 0;
    dietMissingConfirmationsRef.current = 0;
    let disposed = false;
    let refreshing = false;
    const refreshClientAssignments = async () => {
      if (disposed || refreshing || document.visibilityState === 'hidden') return;
      refreshing = true;
      try {
        const [dietResult, routineResult] = await Promise.allSettled([
          getMyDietPlanFromApi(),
          getMyAssignedRoutineFromApi(),
        ]);
        if (disposed) return;
        if (dietResult.status === 'fulfilled') {
          if (dietResult.value) {
            dietMissingConfirmationsRef.current = 0;
            const nextDiets = [dietResult.value];
            setDiets(previous => JSON.stringify(previous) === JSON.stringify(nextDiets) ? previous : nextDiets);
          } else {
            dietMissingConfirmationsRef.current += 1;
            if (dietMissingConfirmationsRef.current >= 2) {
              setDiets([]);
            }
          }
        }
        if (routineResult.status === 'fulfilled') {
          if (routineResult.value) {
            routineMissingConfirmationsRef.current = 0;
            const nextRoutines = [routineResult.value];
            setRoutines(previous => JSON.stringify(previous) === JSON.stringify(nextRoutines) ? previous : nextRoutines);
          } else {
            // Un único null puede ser una respuesta atrasada o transitoria. Solo se
            // limpia la asignación después de dos confirmaciones vacías consecutivas.
            routineMissingConfirmationsRef.current += 1;
            if (routineMissingConfirmationsRef.current >= 2) {
              setRoutines([]);
            }
          }
        }
      } finally {
        refreshing = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshClientAssignments();
    };
    void refreshClientAssignments();
    const intervalId = window.setInterval(() => void refreshClientAssignments(), 4000);
    window.addEventListener('focus', refreshClientAssignments);
    window.addEventListener('online', refreshClientAssignments);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshClientAssignments);
      window.removeEventListener('online', refreshClientAssignments);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [currentUser?.id, currentUser?.role]);

  if (sessionBootstrapping) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-7 text-center shadow-2xl max-w-sm w-full">
          <Loader2 className="w-9 h-9 animate-spin text-red-500 mx-auto mb-4" />
          <p className="font-black">Restaurando tu sesión</p>
          <p className="text-xs text-neutral-400 mt-2">Volverás al módulo donde estabas sin iniciar sesión otra vez.</p>
        </div>
      </div>
    );
  }

  if (!currentUser && sessionRestoreError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="rounded-3xl border border-amber-900/50 bg-neutral-950 p-7 shadow-2xl max-w-md w-full text-center">
          <p className="text-lg font-black">Sesión temporalmente desconectada</p>
          <p className="text-sm text-neutral-400 mt-3 leading-relaxed">{sessionRestoreError}</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => void restoreSession()}
              className="flex-1 rounded-xl bg-red-600 hover:bg-red-500 px-4 py-3 text-xs font-black"
            >
              Reintentar conexión
            </button>
            <button
              type="button"
              onClick={() => {
                clearLocalSessionState();
                setSessionRestoreError('');
              }}
              className="flex-1 rounded-xl border border-neutral-700 px-4 py-3 text-xs font-bold text-neutral-300"
            >
              Ir al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
      {transitionMessage && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
          <div className="rounded-3xl border border-red-900/50 bg-neutral-950 p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,0.9)] max-w-xs">
            <Loader2 className="w-9 h-9 animate-spin text-red-500 mx-auto mb-3" />
            <p className="text-sm font-bold text-white">Cargando...</p>
            <p className="text-xs text-neutral-400 mt-1">{transitionMessage}</p>
          </div>
        </div>
      )}
      <LoginScreen 
        onLogin={handleLogin} 
        onLoginWithCredentials={handleLoginWithCredentials}
        onRegisterClientWithCredentials={handleRegisterClientWithCredentials}
        branding={branding}
        users={users} 
        onRegister={handleRegister} 
      />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      
      {/* Barra de navegación superior */}
      <Navigation 
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={switchTabSafely}
        onLogout={handleLogout}
      />

      {currentUser.role === 'client' && !membershipRestricted && (
        <Suspense fallback={null}>
          <DailyCheckinModal currentUser={currentUser} />
        </Suspense>
      )}

      {/* Área principal de visualización */}
      <main className="flex-1 pb-16">
        <AppErrorBoundary activeTab={activeTab}>
        <Suspense fallback={<ModuleLoading />}>
        {activeTab === 'dashboard' && (
          <DashboardView 
            currentUser={currentUser}
            users={users}
            diets={diets}
            routines={routines}
            onNavigateTab={switchTabSafely}
            branding={branding}
            onBrandingUpdated={setBranding}
          />
        )}

        {activeTab === 'profile' && (
          currentUser.role === 'client'
            ? <AccountHubView
                currentUser={currentUser}
                onAvatarUpdated={handleAvatarUpdated}
                onProfileUpdated={handleProfileUpdated}
                onMembershipUpdated={refreshMembershipState}
                initialTab={membershipRestricted ? 'membership' : 'profile'}
              />
            : <ProfileView currentUser={currentUser} onAvatarUpdated={handleAvatarUpdated} onProfileUpdated={handleProfileUpdated} />
        )}

        {currentUser.role !== 'client' && activeTab === 'clients' && (
          <ClientsView 
            users={users}
            currentUser={currentUser}
            onAddClient={handleAddClient}
            onSelectClientForPlan={handleSelectClientForPlan}
          />
        )}

        {activeTab === 'personal_plan' && (
          currentUser.role === 'client'
            ? <ClientPlanView
                currentUser={currentUser}
                routine={routines.find(routine => routine.clientId === currentUser.id)}
                diet={diets.find(diet => diet.clientId === currentUser.id)}
                onRoutineUpdated={handleGenerateRoutine}
                onDietUpdated={handleGenerateDiet}
              />
            : <PersonalPlanView 
                users={users}
                currentUser={currentUser}
                selectedClientId={selectedClientForPlanId}
                onGenerateDiet={handleGenerateDiet}
                onGenerateRoutine={handleGenerateRoutine}
                onRemoveDiet={handleRemoveDiet}
                onRemoveRoutine={handleRemoveRoutine}
                existingDiets={diets}
                existingRoutines={routines}
              />
        )}

        {currentUser.role === 'client' && activeTab === 'progress_hub' && (
          <ProgressHubView
            currentUser={currentUser}
            users={users}
            onUpdateClientMetrics={handleUpdateClientMetrics}
            onAddPhoto={handleAddProgressPhoto}
          />
        )}

        {currentUser.role === 'client' && activeTab === 'coach_hub' && (
          <CoachHubView currentUser={currentUser} />
        )}

        {currentUser.role !== 'client' && activeTab === 'staff_hub' && (
          <StaffHubView currentUser={currentUser} onNavigateTab={switchTabSafely} />
        )}

        {activeTab === 'timer' && (
          <TabataTimerView currentUser={currentUser} onUpdateTokens={handleUpdateTokens} />
        )}

        {activeTab === 'exercises' && (
          <ExerciseLibraryView currentUser={currentUser} />
        )}

        {activeTab === 'imperial_path' && (
          <ImperialPathView currentUser={currentUser} />
        )}

        {currentUser.role === 'admin' && activeTab === 'membership' && (
          <MembershipView currentUser={currentUser} onMembershipUpdated={refreshMembershipState} />
        )}

        {activeTab === 'history' && (
          <EvolutionHistoryView currentUser={currentUser} users={users} />
        )}

        {activeTab === 'photos' && (
          <ProgressPhotosView 
            currentUser={currentUser}
            users={users}
            onAddPhoto={handleAddProgressPhoto}
          />
        )}

        {activeTab === 'social' && (
          <SocialWallView 
            posts={posts}
            currentUser={currentUser}
            onAddPost={handleAddPost}
            onToggleLike={handleToggleLike}
            onAddComment={handleAddComment}
            users={users}
          />
        )}

        {currentUser.role === 'client' && activeTab === 'friends' && (
          <FriendsView currentUser={currentUser} users={users} />
        )}

        {currentUser.role === 'client' && activeTab === 'tokens' && (
          <TokenShopView 
            currentUser={currentUser}
            onSwitchTab={switchTabSafely}
          />
        )}

        {activeTab === 'body_metrics' && (
          <ProgressAnalyticsView 
            currentUser={currentUser}
            users={users}
            onUpdateClientMetrics={handleUpdateClientMetrics}
          />
        )}

        {activeTab === 'challenges' && (
          <ChallengesView 
            currentUser={currentUser}
            onUpdateTokens={handleUpdateTokens}
          />
        )}

        {currentUser.role === 'admin' && activeTab === 'sync' && (
          <SyncHubView
            currentUser={currentUser}
            users={users}
            diets={diets}
            routines={routines}
          />
        )}

        {currentUser.role === 'admin' && activeTab === 'user_management' && (
          <UserManagementView />
        )}

        {currentUser.role === 'admin' && activeTab === 'recovery' && (
          <RecoveryRequestsView />
        )}

        {currentUser.role !== 'client' && activeTab === 'specialist_assistant' && (
          <SpecialistAssistantView
            currentUser={currentUser}
            users={users}
            diets={diets}
            routines={routines}
          />
        )}

        {currentUser.role === 'admin' && import.meta.env.VITE_DEV_MODE === 'true' && activeTab === 'implementation' && (
          <ImplementationRoadmapView />
        )}

        {currentUser.role === 'admin' && activeTab === 'finance' && (
          <FinanceView 
            users={users}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView 
            currentUser={currentUser}
          />
        )}
        </Suspense>
        </AppErrorBoundary>
      </main>

      {/* Pie de página premium exclusivo */}
      <footer className="mt-auto border-t border-neutral-900 bg-neutral-950 py-6 px-4 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600"></span>
            <span className="font-bold text-white tracking-widest uppercase text-[10px]">
              Imperial Fitness
            </span>
          </div>
          <p className="font-light text-neutral-400">
            Seguimiento corporal, nutrición, progreso y recompensas.
          </p>
          <div className="text-[10px] text-neutral-600">
            &copy; 2026 IMPERIAL FITNESS COLOMBIA. Todos los derechos reservados.
          </div>
        </div>
      </footer>

    </div>
  );
}
