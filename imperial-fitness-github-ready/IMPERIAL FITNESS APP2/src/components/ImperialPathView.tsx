import React from 'react';
import { Crown, Sparkles } from 'lucide-react';
import type { ClientProfile } from '../data/mockData';
import { GamificationPanel } from './GamificationPanel';
import { GamificationAdminPanel } from './GamificationAdminPanel';

interface ImperialPathViewProps {
  currentUser: ClientProfile;
}

export const ImperialPathView: React.FC<ImperialPathViewProps> = ({ currentUser }) => {
  const isClient = currentUser.role === 'client';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl border border-red-900/40 bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950/30 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-red-600/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-red-400 font-black">
              <Sparkles className="w-4 h-4" /> {isClient ? 'Tu ruta de progreso' : 'Panel estratégico interno'}
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-white mt-2">
              {isClient ? 'Camino Imperial' : 'Control Imperial'}
            </h1>
            <p className="text-sm text-neutral-400 mt-2 max-w-2xl">
              {isClient
                ? `${currentUser.name} encuentra aquí una guía simple: qué completar hoy, su racha principal y el siguiente avance.`
                : 'Monitorea constancia, rachas, usuarios con baja actividad y señales internas de seguimiento sin mostrar métricas sensibles al cliente.'}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
            <Crown className="w-6 h-6 text-yellow-300" />
            <div>
              <p className="text-xs font-black text-white">Imperial Fitness</p>
              <p className="text-[10px] uppercase tracking-wider text-yellow-100/60">
                {isClient ? 'Un paso claro cada día' : 'Gestión de retención'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isClient ? <GamificationPanel currentUser={currentUser} /> : <GamificationAdminPanel />}
    </div>
  );
};
