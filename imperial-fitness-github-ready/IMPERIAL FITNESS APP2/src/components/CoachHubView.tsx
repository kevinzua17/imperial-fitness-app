import React, { useState } from 'react';
import { HeartPulse, MessageSquare } from 'lucide-react';
import type { ClientProfile } from '../data/mockData';
import { ChatView } from './ChatView';
import { ImperialCarePanel } from './ImperialCarePanel';

interface CoachHubViewProps { currentUser: ClientProfile; }

type Tab = 'chat' | 'care';

export const CoachHubView: React.FC<CoachHubViewProps> = ({ currentUser }) => {
  const [tab, setTab] = useState<Tab>('chat');
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 rounded-3xl border border-neutral-800 bg-neutral-950 p-4 sm:p-5">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">Mi coach</span>
        <h1 className="mt-1 text-2xl font-black text-white">Comunicación y cuidado</h1>
        <p className="mt-1 text-sm text-neutral-400">Escribe a tu equipo o reporta una molestia sin buscar módulos separados.</p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setTab('chat')} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${tab === 'chat' ? 'bg-sky-600 text-white' : 'border border-neutral-800 bg-neutral-900 text-neutral-300'}`}><MessageSquare className="h-4 w-4" />Chat</button>
          <button type="button" onClick={() => setTab('care')} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${tab === 'care' ? 'bg-amber-500 text-black' : 'border border-neutral-800 bg-neutral-900 text-neutral-300'}`}><HeartPulse className="h-4 w-4" />Reportar molestia</button>
        </div>
      </div>
      {tab === 'chat' ? <ChatView currentUser={currentUser} /> : <ImperialCarePanel client={currentUser} currentUser={currentUser} />}
    </div>
  );
};
