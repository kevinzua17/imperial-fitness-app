import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Dumbbell, Loader2, Plus, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ClientProfile } from '../data/mockData';
import {
  BodyMetricApi,
  WorkoutSetApi,
  createBodyMetricInApi,
  createWorkoutSetInApi,
  listBodyMetricsFromApi,
  listWorkoutHistoryFromApi,
} from '../services/progressService';

interface ProgressAnalyticsViewProps {
  currentUser: ClientProfile;
  users: ClientProfile[];
  onUpdateClientMetrics: (weight: number, fat: number, muscle: number, water: number) => void;
}

const chartTheme = {
  red: '#ef4444',
  emerald: '#34d399',
  amber: '#f59e0b',
  sky: '#38bdf8',
  grid: '#262626',
  text: '#a3a3a3',
};

export const ProgressAnalyticsView: React.FC<ProgressAnalyticsViewProps> = ({ currentUser, users, onUpdateClientMetrics }) => {
  const clients = users.filter(user => user.role === 'client');
  const initialClient = currentUser.role === 'client' ? currentUser : clients[0] || currentUser;
  const [targetUserId, setTargetUserId] = useState(initialClient.id);
  const activeClient = users.find(user => user.id === targetUserId) || initialClient;

  const [bodyHistory, setBodyHistory] = useState<BodyMetricApi[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSetApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [weight, setWeight] = useState(activeClient.weight || 78);
  const [muscleMass, setMuscleMass] = useState(activeClient.muscleMass || 35);
  const [bodyFat, setBodyFat] = useState(activeClient.bodyFat || 22);
  const [visceralFat, setVisceralFat] = useState(10);
  const [bmr, setBmr] = useState(1800);

  const [exerciseName, setExerciseName] = useState('Press banca');
  const [loadKg, setLoadKg] = useState(20);
  const [reps, setReps] = useState(12);
  const [setNumber, setSetNumber] = useState(1);
  const [rir, setRir] = useState(2);
  const [notes, setNotes] = useState('');
  const [lastSuggestion, setLastSuggestion] = useState('');

  const heightMeters = (activeClient.height || 176) / 100;
  const bmi = Math.round((weight / (heightMeters * heightMeters)) * 10) / 10;

  const reload = async (userId = targetUserId) => {
    setLoading(true);
    setMessage('');
    try {
      const [metrics, workouts] = await Promise.all([
        listBodyMetricsFromApi(userId),
        listWorkoutHistoryFromApi(userId),
      ]);
      setBodyHistory(metrics);
      setWorkoutHistory(workouts);
    } catch {
      setMessage('No se pudo cargar el historial desde la API. Revisa backend, permisos y que el usuario tenga sesión activa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setWeight(activeClient.weight || 78);
    setMuscleMass(activeClient.muscleMass || 35);
    setBodyFat(activeClient.bodyFat || 22);
    reload(activeClient.id);
  }, [activeClient.id]);

  const bodyChartData = useMemo(() => bodyHistory.map(item => ({
    date: new Date(item.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
    peso: item.weight,
    musculo: item.muscle_mass,
    grasa: item.body_fat,
    visceral: item.visceral_fat || 0,
    imc: item.bmi || 0,
    tmb: item.bmr || 0,
  })), [bodyHistory]);

  const workoutChartData = useMemo(() => workoutHistory.map(item => ({
    date: new Date(item.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
    exercise: item.exercise_name,
    carga: item.weight_kg,
    reps: item.reps,
    volumen: Math.round(item.weight_kg * item.reps),
  })), [workoutHistory]);

  const personalRecords = useMemo(() => {
    const byExercise = new Map<string, WorkoutSetApi>();
    workoutHistory.forEach(entry => {
      const current = byExercise.get(entry.exercise_name);
      const currentVolume = current ? current.weight_kg * current.reps : 0;
      const entryVolume = entry.weight_kg * entry.reps;
      if (!current || entryVolume > currentVolume) byExercise.set(entry.exercise_name, entry);
    });
    return Array.from(byExercise.values()).sort((a, b) => (b.weight_kg * b.reps) - (a.weight_kg * a.reps)).slice(0, 5);
  }, [workoutHistory]);

  const handleBodySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const metric = await createBodyMetricInApi({
        userId: targetUserId,
        weight,
        muscleMass,
        bodyFat,
        visceralFat,
        bmr,
        bmi,
      });
      setBodyHistory(prev => [...prev, metric]);
      onUpdateClientMetrics(weight, bodyFat, muscleMass, activeClient.waterPercent || 56);
      setMessage('Medición corporal guardada en historial correctamente.');
    } catch {
      setMessage('No se pudo guardar la medición corporal en la API.');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkoutSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const entry = await createWorkoutSetInApi({
        userId: targetUserId,
        exerciseName,
        weightKg: loadKg,
        reps,
        setNumber,
        rir,
        notes,
      });
      setWorkoutHistory(prev => [...prev, entry]);
      setLastSuggestion(entry.suggestion);
      setMessage('Serie registrada. Revisa la sugerencia de progresión.');
      setSetNumber(prev => prev + 1);
    } catch {
      setMessage('No se pudo guardar la serie en la API.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900 to-black p-6 shadow-2xl">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-red-950/30 to-transparent" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-900/60 bg-red-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400 mb-3">
              <Activity className="w-3.5 h-3.5" /> Seguimiento real de evolución
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Progreso corporal y cargas de entrenamiento</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-400 leading-relaxed">
              Registra mediciones corporales como historial, guarda series con peso y repeticiones, y visualiza tu evolución con gráficas reales conectadas a la API.
            </p>
          </div>

          {currentUser.role !== 'client' && (
            <div className="rounded-xl border border-neutral-800 bg-black/50 p-3 flex items-center gap-3">
              <span className="text-xs text-neutral-400">Cliente:</span>
              <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600">
                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {message && <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">{message}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Peso actual" value={`${weight} kg`} tone="white" />
        <MetricCard title="Masa muscular" value={`${muscleMass} kg`} tone="emerald" />
        <MetricCard title="Grasa corporal" value={`${bodyFat}%`} tone="red" />
        <MetricCard title="IMC calculado" value={`${bmi}`} tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleBodySubmit} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Registrar medición corporal</h2>
            </div>
            {loading && <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <NumberField label="Peso (kg)" value={weight} setValue={setWeight} />
            <NumberField label="Masa muscular (kg)" value={muscleMass} setValue={setMuscleMass} />
            <NumberField label="Grasa corporal (%)" value={bodyFat} setValue={setBodyFat} />
            <NumberField label="Grasa visceral" value={visceralFat} setValue={setVisceralFat} />
            <NumberField label="TMB" value={bmr} setValue={setBmr} />
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">IMC automático</label>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white font-mono">{bmi}</div>
            </div>
          </div>
          <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Guardar medición histórica
          </button>
        </form>

        <form onSubmit={handleWorkoutSubmit} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Registrar serie de entrenamiento</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-3">
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Ejercicio</label>
              <input value={exerciseName} onChange={e => setExerciseName(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-600" />
            </div>
            <NumberField label="Peso (kg)" value={loadKg} setValue={setLoadKg} />
            <NumberField label="Reps" value={reps} setValue={setReps} step={1} />
            <NumberField label="Serie #" value={setNumber} setValue={setSetNumber} step={1} />
            <NumberField label="RIR" value={rir} setValue={setRir} step={1} />
            <div className="col-span-2">
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Notas</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Técnica, sensación, dolor, velocidad..." className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-600" />
            </div>
          </div>
          <button type="submit" className="w-full bg-neutral-100 hover:bg-white text-black font-black text-xs py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
            <BarChart3 className="w-4 h-4" /> Registrar serie y recibir sugerencia
          </button>
          {lastSuggestion && (
            <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3 text-xs text-emerald-300 leading-relaxed">
              <strong>Sugerencia de progresión:</strong> {lastSuggestion}
            </div>
          )}
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartPanel title="Evolución corporal" subtitle="Peso, masa muscular y grasa corporal por fecha">
          {bodyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={bodyChartData}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={chartTheme.text} fontSize={11} />
                <YAxis stroke={chartTheme.text} fontSize={11} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: 12, color: '#fff' }} />
                <Legend />
                <Line type="monotone" dataKey="peso" stroke={chartTheme.red} strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="musculo" stroke={chartTheme.emerald} strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="grasa" stroke={chartTheme.amber} strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart text="Registra tu primera medición para ver la evolución." />}
        </ChartPanel>

        <ChartPanel title="Carga y volumen" subtitle="Histograma de carga x repeticiones por entrenamiento">
          {workoutChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={workoutChartData}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={chartTheme.text} fontSize={11} />
                <YAxis stroke={chartTheme.text} fontSize={11} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: 12, color: '#fff' }} />
                <Legend />
                <Bar dataKey="carga" fill={chartTheme.red} radius={[6, 6, 0, 0]} />
                <Bar dataKey="volumen" fill={chartTheme.sky} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart text="Registra una serie para ver cargas y volumen." />}
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Récords personales por ejercicio</h2>
          <div className="space-y-2">
            {personalRecords.map(record => (
              <div key={record.id} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-white block">{record.exercise_name}</span>
                  <span className="text-[10px] text-neutral-500 block">{new Date(record.created_at).toLocaleDateString('es-CO')}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm text-red-400 font-black font-mono block">{record.weight_kg} kg x {record.reps}</span>
                  <span className="text-[10px] text-neutral-500">Volumen: {Math.round(record.weight_kg * record.reps)}</span>
                </div>
              </div>
            ))}
            {personalRecords.length === 0 && <div className="py-8 text-center text-xs text-neutral-500">Aún no hay récords registrados.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Historial reciente de series</h2>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {[...workoutHistory].reverse().slice(0, 10).map(entry => (
              <div key={entry.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
                <div className="flex justify-between gap-3">
                  <span className="text-xs font-bold text-white">{entry.exercise_name}</span>
                  <span className="text-xs text-red-400 font-mono">{entry.weight_kg} kg x {entry.reps}</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{entry.suggestion}</p>
              </div>
            ))}
            {workoutHistory.length === 0 && <div className="py-8 text-center text-xs text-neutral-500">No hay series registradas.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ title: string; value: string; tone: 'white' | 'red' | 'emerald' | 'amber' }> = ({ title, value, tone }) => {
  const tones = {
    white: 'text-white',
    red: 'text-red-500',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
  };
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-xl">
      <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold block">{title}</span>
      <span className={`text-2xl font-black font-mono block mt-1 ${tones[tone]}`}>{value}</span>
    </div>
  );
};

const NumberField: React.FC<{ label: string; value: number; setValue: (value: number) => void; step?: number }> = ({ label, value, setValue, step = 0.1 }) => (
  <div>
    <label className="text-[10px] text-neutral-400 uppercase block mb-1">{label}</label>
    <input
      type="number"
      step={step}
      value={value}
      onChange={e => setValue(Number(e.target.value))}
      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-600 font-mono"
      required
    />
  </div>
);

const ChartPanel: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
    <div className="mb-4">
      <h2 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h2>
      <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
    </div>
    {children}
  </div>
);

const EmptyChart: React.FC<{ text: string }> = ({ text }) => (
  <div className="h-[320px] flex items-center justify-center rounded-xl border border-neutral-900 bg-black/30 text-xs text-neutral-500 text-center p-6">
    {text}
  </div>
);