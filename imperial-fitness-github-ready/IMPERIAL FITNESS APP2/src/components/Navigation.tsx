import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Archive,
  BarChart3,
  BrainCircuit,
  ClipboardList,
  CreditCard,
  Crown,
  DollarSign,
  Dumbbell,
  Globe,
  HeartHandshake,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Timer,
  Trophy,
  UserCircle,
  Users,
  Wifi,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import type { ClientProfile } from '../data/mockData';
import { getAllowedModules, moduleLabel } from '../app/modules';
import { ImperialLogoMark } from './ImperialLogoMark';
import { getUnreadChatCountFromApi } from '../services/chatService';
import { getRecoveryPendingCountFromApi } from '../services/recoveryService';

interface NavigationProps {
  currentUser: ClientProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const fallbackAvatar = '/logo-imperial-fitness.png';

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  profile: UserCircle,
  clients: Users,
  personal_plan: ClipboardList,
  progress_hub: BarChart3,
  coach_hub: HeartHandshake,
  timer: Timer,
  exercises: Dumbbell,
  imperial_path: Crown,
  social: Globe,
  chat: MessageSquare,
  history: Archive,
  photos: Activity,
  body_metrics: Activity,
  challenges: Trophy,
  membership: CreditCard,
  recovery: KeyRound,
  sync: Wifi,
  specialist_assistant: BrainCircuit,
  user_management: ShieldCheck,
  implementation: Rocket,
  finance: DollarSign,
};

export const Navigation: React.FC<NavigationProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
}) => {
  const devMode = import.meta.env.VITE_DEV_MODE === 'true';
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [recoveryPendingCount, setRecoveryPendingCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number | undefined;

    const refreshCounters = async () => {
      if (document.visibilityState === 'hidden') return;
      const chatPromise = getUnreadChatCountFromApi()
        .then(chatCount => mounted && setUnreadChatCount(chatCount))
        .catch(() => mounted && setUnreadChatCount(0));

      if (currentUser.role === 'admin') {
        await Promise.allSettled([
          chatPromise,
          getRecoveryPendingCountFromApi()
            .then(count => mounted && setRecoveryPendingCount(count))
            .catch(() => mounted && setRecoveryPendingCount(0)),
        ]);
      } else {
        if (mounted) setRecoveryPendingCount(0);
        await chatPromise;
      }
    };

    timeoutId = window.setTimeout(refreshCounters, 1200);
    const interval = window.setInterval(refreshCounters, 60000);
    const onVisibility = () => document.visibilityState === 'visible' && void refreshCounters();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mounted = false;
      if (timeoutId) window.clearTimeout(timeoutId);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [currentUser.id, currentUser.role]);

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const tabs = useMemo(
    () => getAllowedModules(currentUser.role, devMode).map(module => ({
      ...module,
      label: moduleLabel(module, currentUser.role),
      icon: ICONS[module.id] || Menu,
    })),
    [currentUser.role, devMode],
  );

  const activeItem = tabs.find(tab => tab.id === activeTab) || tabs[0];
  const ActiveIcon = activeItem?.icon || Menu;
  const avatar = currentUser.avatar || fallbackAvatar;

  const roleDisplay = {
    admin: { title: 'ADMINISTRADOR', color: 'text-red-500' },
    trainer: { title: 'COACH PRO', color: 'text-amber-500' },
    client: { title: 'SOCIO IMPERIAL', color: 'text-sky-400' },
  };

  const selectTab = (tabId: string) => {
    setActiveTab(tabId);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-900 bg-neutral-950/95 px-2 py-2.5 backdrop-blur-md sm:px-4">
      <div className="mx-auto flex max-w-7xl min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex shrink-0 items-center gap-2.5">
          <ImperialLogoMark size="sm" />
          <div>
            <span className="block text-sm font-extrabold tracking-widest text-white">IMPERIAL<span className="text-red-600">FIT</span></span>
            <span className="block text-[9px] uppercase tracking-wider text-neutral-500">Fitness Club</span>
          </div>
        </div>

        <div ref={menuRef} className="relative order-3 w-full md:order-none md:w-auto md:min-w-[260px]">
          <button
            type="button"
            onClick={() => setMenuOpen(open => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/90 px-3 py-2 text-left transition hover:border-red-500/40 md:min-w-[260px]"
          >
            <span className="flex min-w-0 items-center gap-2">
              <ActiveIcon className="h-4 w-4 shrink-0 text-red-500" />
              <span className="min-w-0">
                <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-500">Módulo actual</span>
                <span className="block truncate text-xs font-black text-white">{activeItem?.label || 'Módulos'}</span>
              </span>
            </span>
            <span className="flex items-center gap-2 text-[10px] font-black uppercase text-neutral-400">
              {currentUser.role === 'client' ? 'Menú' : 'Módulos'}
              <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>

          {menuOpen && (
            <nav
              role="menu"
              className={`absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.75)] md:left-1/2 md:right-auto md:-translate-x-1/2 ${currentUser.role === 'client' ? 'md:w-[420px]' : 'md:w-[620px]'}`}
            >
              <div className={`grid grid-cols-1 gap-1 sm:grid-cols-2 ${currentUser.role === 'client' ? '' : 'md:grid-cols-3'}`}>
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const badgeCount = (tab.id === 'chat' || tab.id === 'coach_hub')
                    ? unreadChatCount
                    : tab.id === 'recovery'
                      ? recoveryPendingCount
                      : 0;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="menuitem"
                      onClick={() => selectTab(tab.id)}
                      className={`relative flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-xs font-bold transition ${isActive ? 'border-red-500/50 bg-red-950/35 text-white' : 'border-transparent bg-neutral-900/50 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900'}`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-red-400' : 'text-neutral-500'}`} />
                      <span className="truncate">{tab.label}</span>
                      {badgeCount > 0 && (
                        <span className="ml-auto min-w-[20px] rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[9px] font-black text-white">
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {currentUser.role === 'client' && (
                <p className="px-3 pb-1 pt-3 text-[10px] leading-relaxed text-neutral-500">
                  Cinco accesos principales: hoy, plan, progreso, coach y perfil. Las herramientas secundarias aparecen dentro del flujo cuando las necesitas.
                </p>
              )}
            </nav>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <button type="button" onClick={() => selectTab('profile')} className="flex min-w-0 items-center gap-2 rounded-xl px-1.5 py-1 transition hover:bg-neutral-900">
            <img src={avatar} onError={(e) => { e.currentTarget.src = fallbackAvatar; }} alt={currentUser.name} className="h-8 w-8 rounded-full border border-neutral-700 bg-neutral-900 object-cover" />
            <div className="hidden text-left lg:block">
              <span className="block text-xs font-medium leading-tight text-white">{currentUser.name}</span>
              <span className={`block text-[9px] font-bold uppercase tracking-wider ${roleDisplay[currentUser.role].color}`}>{roleDisplay[currentUser.role].title}</span>
            </div>
          </button>
          <button onClick={onLogout} title="Cerrar sesión" aria-label="Cerrar sesión" className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-900/50 bg-red-950/20 px-2.5 py-1.5 text-red-400 transition-colors hover:bg-red-700 hover:text-white">
            <LogOut className="h-4 w-4" />
            <span className="hidden whitespace-nowrap text-[11px] font-bold sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
};
