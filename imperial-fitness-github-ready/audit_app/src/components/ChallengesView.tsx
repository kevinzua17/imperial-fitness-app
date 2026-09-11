import React, { useEffect, useState } from 'react';
import { Calendar, Check, Plus, Trophy, Users } from 'lucide-react';
import { ClientProfile } from '../data/mockData';
import { ApiChallenge, createChallengeInApi, joinChallengeInApi, listChallengesFromApi } from '../services/challengeService';

interface ChallengesViewProps {
  currentUser: ClientProfile;
  onUpdateTokens: (newAmount: number) => void;
}

export const ChallengesView: React.FC<ChallengesViewProps> = ({ currentUser, onUpdateTokens }) => {
  const [challenges, setChallenges] = useState<ApiChallenge[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [msg, setMsg] = useState('');

  const loadChallenges = () => {
    listChallengesFromApi().then(setChallenges).catch(() => setMsg('No se pudieron cargar retos reales desde la API.'));
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createChallengeInApi({ title, description, status: 'active' })
      .then((created) => {
        setChallenges(prev => [created, ...prev]);
        setTitle('');
        setDescription('');
        setShowCreate(false);
        setMsg('Reto creado correctamente.');
      })
      .catch(() => setMsg('No se pudo crear el reto.'));
  };

  const handleJoin = (challengeId: number) => {
    joinChallengeInApi(challengeId)
      .then(() => {
        setChallenges(prev => prev.map(ch => ch.id === challengeId ? { ...ch, participants_count: ch.participants_count + 1 } : ch));
        onUpdateTokens((currentUser.tokens || 0) + 50);
        setMsg('Inscripción registrada en la base de datos.');
      })
      .catch(() => setMsg('No se pudo inscribir al reto o ya estás inscrito.'));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Retos reales del gimnasio</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Los inscritos y estados salen de registros reales de la base de datos.</p>
        </div>
        {['admin', 'trainer'].includes(currentUser.role) && (
          <button onClick={() => setShowCreate(!showCreate)} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> {showCreate ? 'Cancelar' : 'Crear reto'}
          </button>
        )}
      </div>

      {msg && <div className="p-3 bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-lg">{msg}</div>}

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nombre del reto" required className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción" rows={3} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white resize-none" />
          <button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-2 px-4 rounded-lg">Publicar reto</button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {challenges.map(chal => (
          <div key={chal.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between hover:border-neutral-700 transition-all">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 rounded-lg border border-red-900 bg-red-950/30 text-red-500"><Trophy className="w-5 h-5" /></div>
                <span className="text-[10px] text-neutral-400 bg-neutral-900 px-2 py-1 rounded uppercase">{chal.status}</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">{chal.title}</h3>
              <p className="text-xs text-neutral-400 leading-relaxed min-h-[48px]">{chal.description || 'Sin descripción adicional.'}</p>
              <div className="flex items-center gap-3 text-[11px] text-neutral-400 my-4">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {chal.participants_count} inscritos</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {chal.ends_at ? new Date(chal.ends_at).toLocaleDateString('es-CO') : 'Sin fecha final'}</span>
              </div>
            </div>
            <button onClick={() => handleJoin(chal.id)} className="mt-4 w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs py-2 rounded-lg border border-neutral-700 flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" /> Inscribirme
            </button>
          </div>
        ))}
        {challenges.length === 0 && (
          <div className="col-span-full bg-neutral-950 border border-neutral-800 rounded-xl p-12 text-center">
            <Trophy className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
            <p className="text-sm font-bold text-neutral-300">Aún no hay retos activos.</p>
            <p className="text-xs text-neutral-500 mt-1">Cuando el entrenador o administrador cree uno, aparecerá aquí.</p>
          </div>
        )}
      </div>
    </div>
  );
};