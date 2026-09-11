import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  Globe, 
  Coins, 
  Activity, 
  Trophy, 
  DollarSign, 
  MessageSquare, 
  LogOut,
  Wifi,
  Rocket,
  ShieldCheck,
  BrainCircuit,
  UserCircle
} from 'lucide-react';
import { ClientProfile } from '../data/mockData';
import { ImperialLogoMark } from './ImperialLogoMark';

interface NavigationProps {
  currentUser: ClientProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onClaimDailyTokens: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  onClaimDailyTokens
}) => {
  const devMode = import.meta.env.VITE_DEV_MODE === 'true';
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'trainer', 'client'] },
    { id: 'profile', label: 'Perfil', icon: UserCircle, roles: ['admin', 'trainer', 'client'] },
    { id: 'clients', label: 'Clientes', icon: Users, roles: ['admin', 'trainer'] },
    { id: 'personal_plan', label: currentUser.role === 'client' ? 'Mi plan' : 'Planes', icon: ClipboardList, roles: ['admin', 'trainer', 'client'] },
    { id: 'social', label: 'Comunidad', icon: Globe, roles: ['admin', 'trainer', 'client'] },
    { id: 'friends', label: 'Red social', icon: Users, roles: ['client'] },
    { id: 'photos', label: 'Fotos de Progreso', icon: Activity, roles: ['admin', 'trainer', 'client'] },
    { id: 'tokens', label: 'Recompensas', icon: Coins, roles: ['client'] },
    { id: 'body_metrics', label: currentUser.role === 'client' ? 'Mis medidas' : 'Seguimiento', icon: Activity, roles: ['admin', 'trainer', 'client'] },
    { id: 'challenges', label: 'Retos', icon: Trophy, roles: ['admin', 'trainer', 'client'] },
    { id: 'sync', label: 'Auditoría', icon: Wifi, roles: ['admin'] },
    { id: 'specialist_assistant', label: 'Asistente Interno', icon: BrainCircuit, roles: ['admin', 'trainer'] },
    { id: 'user_management', label: 'Accesos', icon: ShieldCheck, roles: ['admin'] },
    ...(devMode ? [{ id: 'implementation', label: 'Implementación', icon: Rocket, roles: ['admin'] }] : []),
    { id: 'finance', label: 'Financiero', icon: DollarSign, roles: ['admin'] },
    { id: 'chat', label: 'Chat', icon: MessageSquare, roles: ['admin', 'trainer', 'client'] },
  ];

  const filteredTabs = tabs.filter(t => t.roles.includes(currentUser.role));

  const roleDisplay = {
    admin: { title: 'ADMINISTRADOR', color: 'border-red-600 text-red-500' },
    trainer: { title: 'COACH PRO', color: 'border-amber-500 text-amber-500' },
    client: { title: 'SOCIO PREMIUM', color: 'border-sky-500 text-sky-400' }
  };

  return (
    <header className="sticky top-0 z-50 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-900 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Brand & Role Selector */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-2.5">
            <ImperialLogoMark size="sm" />
            <div>
              <span className="font-extrabold text-sm tracking-widest block text-white">
                IMPERIAL<span className="text-red-600">FIT</span>
              </span>
              <span className="text-[9px] text-neutral-500 tracking-wider block uppercase">
                Ecosistema Fitness
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1.5 rounded-lg border border-neutral-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Sesión segura</span>
          </div>
        </div>

        {/* Tab Links - Horizontal Scroll on mobile, premium minimal layout */}
        <nav className="flex items-center gap-1 overflow-x-auto w-full md:w-auto py-1 no-scrollbar justify-start md:justify-center">
          {filteredTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-neutral-900 text-white border-b-2 border-red-600 shadow-sm' 
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-red-500' : 'text-neutral-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* User Info & Tokens */}
        <div className="flex items-center justify-end gap-3 w-full md:w-auto border-t border-neutral-900 md:border-t-0 pt-2 md:pt-0">
          
          {/* Tokens pill */}
          <button
            onClick={onClaimDailyTokens}
            title="Haz clic para entrenar/asistir y ganar tokens"
            className="flex items-center gap-1.5 bg-gradient-to-r from-neutral-900 to-neutral-900/80 hover:from-neutral-850 hover:to-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-full group cursor-pointer transition-all"
          >
            <Coins className="w-3.5 h-3.5 text-amber-500 group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-bold text-amber-400">
              {currentUser.tokens.toLocaleString()}
            </span>
            <span className="text-[9px] bg-red-600/20 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded-full font-semibold group-hover:bg-red-600 group-hover:text-white transition-colors">
              + Reclamar
            </span>
          </button>

          {/* User profile brief */}
          <div className="flex items-center gap-2">
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="w-7 h-7 rounded-full object-cover border border-neutral-700"
            />
            <div className="hidden lg:block text-left">
              <span className="text-xs text-white font-medium block leading-tight">
                {currentUser.name}
              </span>
              <span className={`text-[9px] uppercase tracking-wider block font-bold ${roleDisplay[currentUser.role].color}`}>
                {roleDisplay[currentUser.role].title}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="p-1.5 text-neutral-500 hover:text-red-500 hover:bg-neutral-900 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
};
