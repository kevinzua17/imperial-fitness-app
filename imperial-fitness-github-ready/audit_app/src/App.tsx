import { useEffect, useState } from 'react';
import { 
  ClientProfile, 
  DietPlan, 
  WorkoutRoutine, 
  SocialPost,
  ProgressPhoto
} from './data/mockData';
import { LoginScreen } from './components/LoginScreen';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { ClientsView } from './components/ClientsView';
import { PersonalPlanView } from './components/PersonalPlanView';
import { SocialWallView } from './components/SocialWallView';
import { TokenShopView } from './components/TokenShopView';
import { ProgressAnalyticsView } from './components/ProgressAnalyticsView';
import { ChallengesView } from './components/ChallengesView';
import { FinanceView } from './components/FinanceView';
import { ChatView } from './components/ChatView';
import { ProgressPhotosView } from './components/ProgressPhotosView';
import { SyncHubView } from './components/SyncHubView';
import { ImplementationRoadmapView } from './components/ImplementationRoadmapView';
import { UserManagementView } from './components/UserManagementView';
import { SpecialistAssistantView } from './components/SpecialistAssistantView';
import { ProfileView } from './components/ProfileView';
import { FriendsView } from './components/FriendsView';
import { getCurrentUserFromApi, loginWithApi, logoutFromApi, registerClientWithApi } from './services/authService';
import { listUsersFromApi } from './services/userService';
import { getMyDietPlanFromApi, listDietPlansFromApi } from './services/nutritionService';
import { getMyAssignedRoutineFromApi, listAssignedRoutinesFromApi } from './services/routineService';
import { BrandingSettings, getBrandingFromApi } from './services/mediaService';

export default function App() {
  // Estados Globales
  const [users, setUsers] = useState<ClientProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<ClientProfile | null>(null);
  
  // Módulos
  const [diets, setDiets] = useState<DietPlan[]>([]);
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  
  // Navegación
  useEffect(() => {
    getBrandingFromApi().then(setBranding).catch(() => undefined);
    if (localStorage.getItem('imperial_access_token')) {
      getCurrentUserFromApi()
        .then(user => {
          setCurrentUser(user);
          if (user.role === 'client') {
            return Promise.all([
              Promise.resolve([user]),
              getMyDietPlanFromApi().then(plan => plan ? [plan] : []),
              getMyAssignedRoutineFromApi().then(routine => routine ? [routine] : []),
            ]);
          }
          return Promise.all([listUsersFromApi(), listDietPlansFromApi(), listAssignedRoutinesFromApi()]);
        })
        .then(([apiUsers, apiDiets, apiRoutines]) => {
          setUsers(apiUsers);
          setDiets(apiDiets);
          setRoutines(apiRoutines);
        })
        .catch(() => logoutFromApi());
    }
  }, []);

  const [activeTab, setActiveTab] = useState<string>(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    return requestedTab || 'dashboard';
  });
  const [selectedClientForPlanId, setSelectedClientForPlanId] = useState<string | undefined>(undefined);

  const allowedTabsByRole: Record<ClientProfile['role'], string[]> = {
    admin: ['dashboard', 'profile', 'clients', 'personal_plan', 'social', 'photos', 'body_metrics', 'challenges', 'sync', 'specialist_assistant', 'user_management', 'implementation', 'finance', 'chat'],
    trainer: ['dashboard', 'profile', 'clients', 'personal_plan', 'social', 'photos', 'body_metrics', 'challenges', 'specialist_assistant', 'chat'],
    client: ['dashboard', 'profile', 'personal_plan', 'social', 'friends', 'photos', 'tokens', 'body_metrics', 'challenges', 'chat'],
  };

  const isTabAllowed = (tab: string, role: ClientProfile['role']) => {
    const devMode = import.meta.env.VITE_DEV_MODE === 'true';
    if (tab === 'implementation' && !devMode) return false;
    return allowedTabsByRole[role].includes(tab);
  };

  const switchTabSafely = (tab: string) => {
    if (!currentUser || isTabAllowed(tab, currentUser.role)) {
      setActiveTab(tab);
      return;
    }
    setActiveTab('dashboard');
  };

  // Handlers de Autenticación
  const handleLogin = (user: ClientProfile) => {
    setCurrentUser(user);
    switchTabSafely('dashboard');
  };

  const handleLoginWithCredentials = async (email: string, password: string) => {
    const apiUser = await loginWithApi(email, password);
    setCurrentUser(apiUser);
    switchTabSafely('dashboard');

    try {
      const [apiUsers, apiDiets, apiRoutines] = apiUser.role === 'client'
        ? await Promise.all([
            Promise.resolve([apiUser]),
            getMyDietPlanFromApi().then(plan => plan ? [plan] : []),
            getMyAssignedRoutineFromApi().then(routine => routine ? [routine] : []),
          ])
        : await Promise.all([listUsersFromApi(), listDietPlansFromApi(), listAssignedRoutinesFromApi()]);
      if (apiUsers.length > 0) {
        setUsers(apiUsers);
      }
      setDiets(apiDiets);
      setRoutines(apiRoutines);
    } catch {
      // If a secondary endpoint fails, keep at least the authenticated user in memory.
      setUsers(prev => [apiUser, ...prev.filter(u => u.id !== apiUser.id)]);
    }
  };

  const handleRegister = (newUser: ClientProfile) => {
    setUsers([newUser, ...users]);
  };

  const handleRegisterClientWithCredentials = async (payload: { name: string; email: string; password: string; goal?: string }) => {
    const pendingUser = await registerClientWithApi(payload);
    setUsers(prev => [pendingUser, ...prev.filter(u => u.id !== pendingUser.id)]);
  };

  const handleLogout = async () => {
    await logoutFromApi();
    setCurrentUser(null);
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
    const cleaned = diets.filter(d => d.clientId !== newDiet.clientId);
    setDiets([newDiet, ...cleaned]);
  };

  const handleGenerateRoutine = (newRoutine: WorkoutRoutine) => {
    const cleaned = routines.filter(r => r.clientId !== newRoutine.clientId);
    setRoutines([newRoutine, ...cleaned]);
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
  const handleUpdateClientMetrics = (weight: number, fat: number, muscle: number, water: number) => {
    if (!currentUser) return;
    const updatedMe = { 
      ...currentUser, 
      weight, 
      bodyFat: fat, 
      muscleMass: muscle, 
      waterPercent: water,
      streak: (currentUser.streak || 0) + 1 
    };
    setCurrentUser(updatedMe);
    setUsers(users.map(u => u.id === currentUser.id ? updatedMe : u));
    handleUpdateTokens((updatedMe.tokens || 0) + 75);
  };

  const handleClaimDailyTokens = () => {
    if (!currentUser) return;
    const bonus = 150;
    handleUpdateTokens((currentUser.tokens || 0) + bonus);
    alert(`⚡ IMPERIAL RECOMPENSAS: Has reclamado un bono de asistencia en sala de +${bonus} Tokens. Tus métricas están al día.`);
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
    if (currentUser && !isTabAllowed(activeTab, currentUser.role)) {
      setActiveTab('dashboard');
    }
  }, [currentUser?.role, activeTab]);

  if (!currentUser) {
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        onLoginWithCredentials={handleLoginWithCredentials}
        onRegisterClientWithCredentials={handleRegisterClientWithCredentials}
        branding={branding}
        users={users} 
        onRegister={handleRegister} 
      />
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
        onClaimDailyTokens={handleClaimDailyTokens}
      />

      {/* Área principal de visualización del módulo */}
      <main className="flex-1 pb-16">
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
          <ProfileView currentUser={currentUser} onAvatarUpdated={handleAvatarUpdated} onProfileUpdated={handleProfileUpdated} />
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
          <PersonalPlanView 
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
      </main>

      {/* Pie de página premium exclusivo */}
      <footer className="mt-auto border-t border-neutral-900 bg-neutral-950 py-6 px-4 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600"></span>
            <span className="font-bold text-white tracking-widest uppercase text-[10px]">
              Imperial Fitness Ecosystem v4.0
            </span>
          </div>
          <p className="font-light text-neutral-400">
            Seguimiento Corporal, Nutrición Dinámica y Control Operativo Asignado.
          </p>
          <div className="text-[10px] text-neutral-600">
            &copy; 2026 IMPERIAL FITNESS COLOMBIA. Todos los derechos reservados.
          </div>
        </div>
      </footer>

    </div>
  );
}
