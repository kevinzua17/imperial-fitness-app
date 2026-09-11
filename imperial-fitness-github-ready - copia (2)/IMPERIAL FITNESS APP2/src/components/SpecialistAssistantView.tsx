import React, { useMemo, useState } from 'react';
import { AlertTriangle, BrainCircuit, Copy, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { ClientProfile, DietPlan, WorkoutRoutine } from '../data/mockData';
import { requestSpecialistSuggestion, SpecialistSuggestionResponse } from '../services/specialistService';

interface SpecialistAssistantViewProps {
  currentUser: ClientProfile;
  users: ClientProfile[];
  diets: DietPlan[];
  routines: WorkoutRoutine[];
}

export const SpecialistAssistantView: React.FC<SpecialistAssistantViewProps> = ({ currentUser, users, diets, routines }) => {
  const clients = users.filter(user => user.role === 'client');
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const selectedClient = clients.find(client => client.id === clientId) || clients[0];
  const [question, setQuestion] = useState('Revisa el progreso y sugiere si conviene ajustar calorías, carbohidratos o carga de entrenamiento esta semana.');
  const [result, setResult] = useState<SpecialistSuggestionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentDiet = useMemo(() => diets.find(diet => diet.clientId === selectedClient?.id), [diets, selectedClient?.id]);
  const currentRoutine = useMemo(() => routines.find(routine => routine.clientId === selectedClient?.id), [routines, selectedClient?.id]);

  const metricsText = selectedClient
    ? `Peso: ${selectedClient.weight || 'sin dato'} kg. Grasa corporal: ${selectedClient.bodyFat || 'sin dato'}%. Masa muscular: ${selectedClient.muscleMass || 'sin dato'} kg. Asistencia: ${selectedClient.attendanceRate}%. Objetivo: ${selectedClient.goal || 'sin objetivo'}.`
    : '';

  const dietText = currentDiet
    ? `Calorías: ${currentDiet.baseCalories}. Proteína: ${currentDiet.protein}g. Carbohidratos: ${currentDiet.carbs}g. Grasas: ${currentDiet.fat}g. Comidas: ${currentDiet.meals.map(meal => `${meal.name}: ${meal.items.map(item => `${item.amountGrams}g ${item.currentName}`).join(', ')}`).join(' | ')}`
    : 'Sin dieta activa registrada.';

  const routineText = currentRoutine
    ? `${currentRoutine.title}. ${currentRoutine.days.map(day => `${day.day}: ${day.exercises.map(ex => `${ex.name} ${ex.sets}x${ex.reps}`).join(', ')}`).join(' | ')}`
    : 'Sin rutina activa registrada.';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClient) {
      setError('No hay cliente seleccionado.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await requestSpecialistSuggestion({
        client_id: Number(selectedClient.id),
        client_name: selectedClient.name,
        goal: selectedClient.goal || 'Mejora de composición corporal',
        question,
        recent_metrics: metricsText,
        current_diet: dietText,
        current_routine: routineText,
      });
      setResult(response);
    } catch {
      setError('No se pudo consultar el asistente coach. Verifica tu sesión e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyDraft = () => {
    if (result?.coach_message_draft) {
      navigator.clipboard.writeText(result.coach_message_draft).catch(() => undefined);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-red-950/25 to-transparent" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-900/60 bg-red-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400 mb-3">
            <BrainCircuit className="w-3.5 h-3.5" /> Asistente interno del especialista
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Sugerencias privadas para entrenador y administrador</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-400 leading-relaxed">
            Esta herramienta usa un modelo externo solo para apoyar al equipo interno. El cliente no ve esta pestaña ni sabe que se generó una sugerencia. El entrenador revisa y decide.
          </p>
          <span className="mt-3 inline-block text-[10px] text-neutral-500 uppercase tracking-wider">
            Operador actual: {currentUser.name} · {currentUser.role}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-1 rounded-2xl border border-neutral-800 bg-neutral-950 p-5 space-y-4 h-fit">
          <div className="flex items-center gap-2 border-b border-neutral-900 pb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Consulta segura</h2>
          </div>

          <div>
            <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">Cliente</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full rounded-lg border border-neutral-800 bg-neutral-900 p-2.5 text-xs text-white focus:outline-none focus:border-red-600">
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-[11px] text-neutral-400 space-y-1">
            <p><strong className="text-white">Métricas:</strong> {metricsText}</p>
            <p><strong className="text-white">Dieta:</strong> {currentDiet ? `${currentDiet.baseCalories} kcal` : 'No registrada'}</p>
            <p><strong className="text-white">Rutina:</strong> {currentRoutine?.title || 'No registrada'}</p>
          </div>

          <div>
            <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">Pregunta interna</label>
            <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={6} className="w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-600 resize-none" />
          </div>

          <button type="submit" disabled={loading || !selectedClient} className="w-full rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 text-white text-xs font-bold p-3 transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Analizando...' : 'Generar sugerencia privada'}
          </button>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-200 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>No enviar al cliente sin revisión humana. Esta herramienta no reemplaza criterio profesional.</span>
          </div>
        </form>

        <div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-5 min-h-[520px]">
          {error && <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/20 p-3 text-xs text-red-300">{error}</div>}

          {!result && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <BrainCircuit className="w-14 h-14 text-neutral-700 mb-4" />
              <h2 className="text-lg font-bold text-white">Sin sugerencia generada</h2>
              <p className="text-xs text-neutral-500 max-w-md mt-2">
                Selecciona un cliente, escribe la pregunta interna y genera una recomendación para revisión del entrenador.
              </p>
            </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-4" />
              <p className="text-sm text-neutral-300 font-semibold">Analizando contexto del cliente...</p>
              <p className="text-xs text-neutral-500 mt-1">El resultado quedará visible solo para staff.</p>
            </div>
          )}

          {result && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider block">Fuente: {result.source === 'openai' ? 'modelo conectado' : 'configuración pendiente'}</span>
                  <h2 className="text-lg font-black text-white">Resultado para {selectedClient?.name}</h2>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-2">Resumen</span>
                <p className="text-sm text-neutral-200 leading-relaxed">{result.summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-4">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-3">Recomendaciones</span>
                  <ul className="space-y-2">
                    {result.recommendations.map((item, idx) => (
                      <li key={idx} className="text-xs text-neutral-300 flex gap-2 leading-relaxed">
                        <span className="text-emerald-500 font-bold">{idx + 1}.</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-4">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-3">Precauciones</span>
                  <ul className="space-y-2">
                    {result.cautions.map((item, idx) => (
                      <li key={idx} className="text-xs text-neutral-300 flex gap-2 leading-relaxed">
                        <span className="text-amber-500 font-bold">!</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Borrador de mensaje para el cliente</span>
                  <button onClick={copyDraft} className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-2 py-1 rounded flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Copiar
                  </button>
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed italic">{result.coach_message_draft}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};