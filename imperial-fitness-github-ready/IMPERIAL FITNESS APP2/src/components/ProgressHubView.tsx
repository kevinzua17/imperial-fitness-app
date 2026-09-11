import React, { useState } from 'react';
import { Activity, Camera, History } from 'lucide-react';
import type { ClientProfile, ProgressPhoto } from '../data/mockData';
import { ProgressAnalyticsView } from './ProgressAnalyticsView';
import { ProgressPhotosView } from './ProgressPhotosView';
import { EvolutionHistoryView } from './EvolutionHistoryView';

interface ProgressHubViewProps {
  currentUser: ClientProfile;
  users: ClientProfile[];
  onUpdateClientMetrics: (weight: number, fat: number, muscle: number, water?: number, height?: number, age?: number, gender?: 'M' | 'F', targetUserId?: string) => void;
  onAddPhoto: (photo: ProgressPhoto, clientId: string) => void;
}

type Tab = 'metrics' | 'photos' | 'history';

export const ProgressHubView: React.FC<ProgressHubViewProps> = ({ currentUser, users, onUpdateClientMetrics, onAddPhoto }) => {
  const [tab, setTab] = useState<Tab>('metrics');
  const items = [
    { id: 'metrics' as const, label: 'Medidas', icon: Activity },
    { id: 'photos' as const, label: 'Fotos', icon: Camera },
    { id: 'history' as const, label: 'Historial', icon: History },
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 rounded-3xl border border-neutral-800 bg-neutral-950 p-4 sm:p-5">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Progreso</span>
        <h1 className="mt-1 text-2xl font-black text-white">Todo tu avance en un solo lugar</h1>
        <p className="mt-1 text-sm text-neutral-400">Medidas, fotografías e historial dejaron de competir como módulos separados.</p>
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {items.map(item => {
            const Icon = item.icon;
            return <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${tab === item.id ? 'bg-emerald-600 text-white' : 'border border-neutral-800 bg-neutral-900 text-neutral-300'}`}><Icon className="h-4 w-4" />{item.label}</button>;
          })}
        </div>
      </div>
      {tab === 'metrics' && <ProgressAnalyticsView currentUser={currentUser} users={users} onUpdateClientMetrics={onUpdateClientMetrics} />}
      {tab === 'photos' && <ProgressPhotosView currentUser={currentUser} users={users} onAddPhoto={onAddPhoto} />}
      {tab === 'history' && <EvolutionHistoryView currentUser={currentUser} users={users} />}
    </div>
  );
};
