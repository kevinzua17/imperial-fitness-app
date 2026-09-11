import React from 'react';
import { Bell, Coins, Flame, Target, Trophy, Zap } from 'lucide-react';
import { ClientProfile, DietPlan, WorkoutRoutine } from '../data/mockData';

interface GamificationSummaryCardProps {
  currentUser: ClientProfile;
  users: ClientProfile[];
  diets: DietPlan[];
  routines: WorkoutRoutine[];
  onNavigateTab: (tab: string) => void;
}

const clampPercent = (value?: number) => Math.max(0, Math.min(100, Number.isFinite(value || 0) ? value || 0 : 0));

export const GamificationSummaryCard: React.FC<GamificationSummaryCardProps> = ({
  currentUser,
  users,
  diets,
  routines,
  onNavigateTab
}) => {
  const isClient = currentUser.role === 'client';
  const clients = users.filter(user => user.role === 'client');
  const myRoutine = routines.find(routine => routine.clientId === currentUser.id);
  const myDiet = diets.find(diet => diet.clientId === currentUser.id);
  const attendance = clampPercent(currentUser.attendanceRate || 0);
  const bodyProgress = clampPercent(100 - (currentUser.bodyFat || 22));
  const streak = currentUser.streak || 0;
  const tokens = currentUser.tokens || 0;

  const weeklyPosition = isClient
    ? [...clients]
        .sort((a, b) => ((b.tokens || 0) + (b.streak || 0) * 40 + (b.attendanceRate || 0) * 8) - ((a.tokens || 0) + (a.streak || 0) * 40 + (a.attendanceRate || 0) * 8))
        .findIndex(user => user.id === currentUser.id) + 1
    : 0;

  const notifications = isClient
    ? [
        myRoutine ? 'Tu rutina asignada está lista para entrenar.' : 'Aún falta asignar tu rutina de entrenamiento.',
        myDiet ? 'Tu pauta nutricional ya está disponible.' : 'Tu pauta nutricional está pendiente de asignación.',
        streak >= 3 ? `Llevas ${streak} días de racha. Mantén el ritmo.` : 'Registra asistencia para construir tu racha semanal.',
      ]
    : [
        `${clients.length} clientes activos en el ecosistema.`,
        `${routines.length} rutina(s) asignada(s) actualmente.`,
        `${diets.length} pauta(s) nutricional(es) registradas.`,
      ];

  return (
    <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <div className="xl:col-span-7 bg-gradient-to-br from-neutral-950 via-neutral-950 to-neutral-900 border border-neutral-800 rounded-2xl p-5 overflow-hidden relative">
        <div className="absolute -right-16 -top-20 w-44 h-44 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-amber-400 font-black">Gamificación Imperial</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {isClient ? 'Tu progreso y recompensas' : 'Motivación y actividad del gimnasio'}
            </h2>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
              {isClient
                ? 'Aquí se concentra tu avance, tokens, racha y alertas importantes para que no tengas que buscarlas en varias secciones.'
                : 'Vista rápida del sistema de motivación: clientes, planes, rutinas y actividad general.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 min-w-[250px]">
            <div className="rounded-xl bg-neutral-900/80 border border-neutral-800 p-3 text-center">
              <Coins className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <span className="block text-lg font-black text-amber-300 font-mono">{tokens.toLocaleString()}</span>
              <span className="block text-[9px] text-neutral-500 uppercase font-bold">Tokens</span>
            </div>
            <div className="rounded-xl bg-neutral-900/80 border border-neutral-800 p-3 text-center">
              <Flame className="w-4 h-4 text-red-400 mx-auto mb-1" />
              <span className="block text-lg font-black text-white font-mono">{streak}</span>
              <span className="block text-[9px] text-neutral-500 uppercase font-bold">Racha</span>
            </div>
            <div className="rounded-xl bg-neutral-900/80 border border-neutral-800 p-3 text-center">
              <Target className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <span className="block text-lg font-black text-white font-mono">{isClient && weeklyPosition > 0 ? `#${weeklyPosition}` : clients.length}</span>
              <span className="block text-[9px] text-neutral-500 uppercase font-bold">{isClient ? 'Podio' : 'Clientes'}</span>
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-400 font-semibold">Adherencia semanal</span>
              <span className="text-white font-black">{attendance}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${attendance}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-400 font-semibold">Progreso corporal</span>
              <span className="text-white font-black">{bodyProgress}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden">
              <div className="h-2 rounded-full bg-red-500" style={{ width: `${bodyProgress}%` }} />
            </div>
          </div>
        </div>

        <div className="relative flex flex-col sm:flex-row gap-2 mt-4">
          <button onClick={() => onNavigateTab(isClient ? 'tokens' : 'challenges')} className="flex-1 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black px-4 py-2.5 transition-colors flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" /> {isClient ? 'Ver recompensas' : 'Ver retos'}
          </button>
          <button onClick={() => onNavigateTab('body_metrics')} className="flex-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-bold px-4 py-2.5 transition-colors">
            Ver progreso completo
          </button>
        </div>
      </div>

      <div className="xl:col-span-5 bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-sky-400" />
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-white block">Notificaciones</span>
            <span className="text-[10px] text-neutral-500 block">Resumen visible desde el dashboard</span>
          </div>
        </div>
        <div className="space-y-2">
          {notifications.map((notification, index) => (
            <div key={`${notification}-${index}`} className="rounded-xl bg-neutral-900/60 border border-neutral-800 p-3 text-xs text-neutral-300 leading-relaxed flex gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span>{notification}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
