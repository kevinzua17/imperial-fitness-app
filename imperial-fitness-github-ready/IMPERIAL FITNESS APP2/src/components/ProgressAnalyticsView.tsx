import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Loader2, Plus, TrendingUp } from 'lucide-react';
import {
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
  createBodyMetricInApi,
  listBodyMetricsFromApi,
  updateBodyMetricInApi,
} from '../services/progressService';
import { updateUserProfileInApi } from '../services/userService';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

interface ProgressAnalyticsViewProps {
  currentUser: ClientProfile;
  users: ClientProfile[];
  onUpdateClientMetrics: (weight: number, fat: number, muscle: number, water?: number, height?: number, age?: number, gender?: 'M' | 'F', targetUserId?: string) => void;
}

type GenderValue = 'M' | 'F';
type BmrSourceValue = 'inbody' | 'mifflin_st_jeor';

const calculateBmr = (weight: number, height: number, age: number, gender: GenderValue | '') => {
  if (weight <= 0 || height <= 0 || age <= 0 || !gender) return 0;
  const sexConstant = gender === 'F' ? -161 : 5;
  return Math.round((10 * weight) + (6.25 * height) - (5 * age) + sexConstant);
};

const visceralLevelLabel = (level: number) => {
  if (!level || level < 1) return 'Sin dato';
  if (level <= 9) return 'Saludable';
  if (level <= 14) return 'Atención';
  return 'Alto';
};

const chartTheme = {
  red: '#ef4444',
  emerald: '#34d399',
  amber: '#f59e0b',
  sky: '#38bdf8',
  violet: '#a78bfa',
  grid: '#262626',
  text: '#a3a3a3',
};

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const metricDate = (metric: BodyMetricApi) => metric.measured_at || metric.created_at;

const sortMetricsByDate = (metrics: BodyMetricApi[]) => [...metrics].sort((a, b) => {
  const dateDiff = new Date(metricDate(a)).getTime() - new Date(metricDate(b)).getTime();
  return dateDiff || a.id - b.id;
});

const toDateInputValue = (value?: string | null) => {
  if (!value) return todayInputValue();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return todayInputValue();
  return date.toISOString().slice(0, 10);
};

const toMeasurementIso = (dateValue: string) => `${dateValue || todayInputValue()}T12:00:00`;

const shortDate = (value?: string | null) => value
  ? new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  : 'Sin fecha';

export const ProgressAnalyticsView: React.FC<ProgressAnalyticsViewProps> = ({ currentUser, users, onUpdateClientMetrics }) => {
  const clients = useMemo(() => users.filter(user => user.role === 'client'), [users]);
  const targetStorageKey = `imperial_body_metrics_target_${currentUser.id}`;
  const [targetUserId, setTargetUserId] = useState(() => (
    currentUser.role === 'client' ? currentUser.id : safeGetItem(targetStorageKey) || ''
  ));
  const activeClient = currentUser.role === 'client'
    ? currentUser
    : clients.find(user => user.id === targetUserId);
  const formClient = activeClient || currentUser;
  const canSeeRecordedDate = currentUser.role !== 'client';

  const [bodyHistory, setBodyHistory] = useState<BodyMetricApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editingMetricId, setEditingMetricId] = useState<number | null>(null);

  const [weight, setWeight] = useState(formClient.weight || 0);
  const [muscleMass, setMuscleMass] = useState(formClient.muscleMass || 0);
  const [bodyFat, setBodyFat] = useState(formClient.bodyFat || 0);
  const [visceralFat, setVisceralFat] = useState(0);
  const [height, setHeight] = useState(formClient.height || 0);
  const [age, setAge] = useState(formClient.age || 0);
  const [gender, setGender] = useState<GenderValue | ''>((formClient.gender || '') as GenderValue | '');
  const [bmrSource, setBmrSource] = useState<BmrSourceValue>('inbody');
  const [bmr, setBmr] = useState(0);
  const [measurementDate, setMeasurementDate] = useState(todayInputValue());

  const heightMeters = height > 0 ? height / 100 : 0;
  const bmi = heightMeters > 0 && weight > 0 ? Math.round((weight / (heightMeters * heightMeters)) * 10) / 10 : 0;
  const estimatedBmr = calculateBmr(weight, height, age, gender);

  const reload = async (userId: string) => {
    if (!userId) return;
    setLoading(true);
    setMessage('');
    try {
      const metrics = await listBodyMetricsFromApi(userId);
      setBodyHistory(sortMetricsByDate(metrics));
    } catch {
      setMessage('No se pudo cargar el historial de medidas. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser.role === 'client') {
      if (targetUserId !== currentUser.id) setTargetUserId(currentUser.id);
      return;
    }

    if (clients.length === 0) return;
    if (targetUserId && clients.some(client => client.id === targetUserId)) return;
    const storedClientId = safeGetItem(targetStorageKey);
    const nextClientId = clients.find(client => client.id === storedClientId)?.id || clients[0]?.id || '';
    if (nextClientId !== targetUserId) setTargetUserId(nextClientId);
  }, [clients, currentUser.id, currentUser.role, targetStorageKey, targetUserId]);

  useEffect(() => {
    if (currentUser.role !== 'client' && targetUserId) {
      safeSetItem(targetStorageKey, targetUserId);
    }
  }, [currentUser.role, targetStorageKey, targetUserId]);

  useEffect(() => {
    if (!activeClient) {
      setBodyHistory([]);
      return;
    }
    setWeight(activeClient.weight || 0);
    setMuscleMass(activeClient.muscleMass || 0);
    setBodyFat(activeClient.bodyFat || 0);
    setHeight(activeClient.height || 0);
    setAge(activeClient.age || 0);
    setGender((activeClient.gender || '') as GenderValue | '');
    setVisceralFat(0);
    setBmrSource('inbody');
    setEditingMetricId(null);
    setMeasurementDate(todayInputValue());
    setBmr(0);
    void reload(activeClient.id);
  }, [activeClient?.id]);

  useEffect(() => {
    if (bmrSource === 'mifflin_st_jeor') setBmr(estimatedBmr);
  }, [bmrSource, estimatedBmr]);

  const bodyChartData = useMemo(() => bodyHistory.map(item => ({
    date: new Date(metricDate(item)).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
    peso: item.weight,
    musculo: item.muscle_mass,
    grasa: item.body_fat,
    visceral: item.visceral_fat || 0,
    imc: item.bmi || 0,
    tmb: item.bmr || 0,
  })), [bodyHistory]);

  const latestMetric = bodyHistory.length > 0 ? bodyHistory[bodyHistory.length - 1] : null;

  const loadMetricForEdit = (entry: BodyMetricApi) => {
    setEditingMetricId(entry.id);
    setWeight(entry.weight);
    setMuscleMass(entry.muscle_mass);
    setBodyFat(entry.body_fat);
    setVisceralFat(entry.visceral_fat || 0);
    setBmrSource(entry.bmr_source === 'mifflin_st_jeor' ? 'mifflin_st_jeor' : 'inbody');
    setBmr(entry.bmr || 0);
    setMeasurementDate(toDateInputValue(metricDate(entry)));
    setMessage('Editando medición histórica. Puedes corregir valores o fecha real de toma.');
  };

  const cancelEdit = () => {
    setEditingMetricId(null);
    setMeasurementDate(todayInputValue());
    setMessage('');
  };

  const handleBodySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    if (!activeClient || activeClient.role !== 'client') {
      setMessage('Espera a que cargue la lista de clientes y selecciona una persona antes de registrar medidas.');
      setLoading(false);
      return;
    }
    if (weight < 20 || height < 120 || age < 10 || !gender || muscleMass < 5 || bodyFat < 2) {
      setMessage('Completa peso, estatura, edad, sexo, masa muscular y grasa corporal con datos reales antes de guardar.');
      setLoading(false);
      return;
    }
    if (bmrSource === 'inbody' && bmr < 500) {
      setMessage('Ingresa la TMB que aparece en el reporte InBody o selecciona cálculo Mifflin-St Jeor.');
      setLoading(false);
      return;
    }
    try {
      const payload = {
        weight,
        muscleMass,
        bodyFat,
        visceralFat: visceralFat > 0 ? visceralFat : undefined,
        bmr: bmrSource === 'mifflin_st_jeor' ? estimatedBmr : bmr,
        bmrSource,
        bmi,
        measuredAt: toMeasurementIso(measurementDate),
      };
      const metric = editingMetricId
        ? await updateBodyMetricInApi(editingMetricId, payload)
        : await createBodyMetricInApi({ userId: targetUserId, ...payload });
      const newestOtherMetricTime = Math.max(0, ...bodyHistory
        .filter(item => item.id !== metric.id)
        .map(item => new Date(metricDate(item)).getTime())
      );
      const shouldRefreshCurrentMetric = new Date(metricDate(metric)).getTime() >= newestOtherMetricTime;
      setBodyHistory(prev => sortMetricsByDate(editingMetricId ? prev.map(item => item.id === metric.id ? metric : item) : [...prev, metric]));
      if (shouldRefreshCurrentMetric) {
        await updateUserProfileInApi(targetUserId, {
          weight,
          height,
          age,
          gender: gender as GenderValue,
          body_fat: bodyFat,
          muscle_mass: muscleMass,
        });
        onUpdateClientMetrics(weight, bodyFat, muscleMass, activeClient?.waterPercent, height, age, gender as GenderValue, targetUserId);
      }
      setEditingMetricId(null);
      setMessage(shouldRefreshCurrentMetric
        ? 'Medición corporal guardada en la fecha indicada.'
        : 'Medición histórica guardada. No reemplazó la medición actual porque existe una toma más reciente.'
      );
    } catch {
      setMessage('No se pudo guardar la medición corporal. Intenta nuevamente.');
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
              <Activity className="w-3.5 h-3.5" /> Seguimiento corporal
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{currentUser.role === 'client' ? 'Mis medidas corporales' : 'Medidas corporales de clientes'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-400 leading-relaxed">
              Registra peso, masa muscular, grasa corporal, IMC y datos de InBody usando la fecha real de toma. Si la medición fue el 10 y la cargas el 20, quedará ubicada el 10 en gráficas e historial.
            </p>
          </div>

          {currentUser.role !== 'client' && (
            <div className="rounded-xl border border-neutral-800 bg-black/50 p-3 flex items-center gap-3">
              <span className="text-xs text-neutral-400">Cliente:</span>
              <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600">
                <option value="" disabled>{clients.length > 0 ? 'Selecciona un cliente' : 'Cargando clientes...'}</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-3 text-xs text-red-200">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Peso actual" value={weight > 0 ? `${weight} kg` : 'Sin dato'} tone="white" />
        <MetricCard title="IMC" value={bmi > 0 ? `${bmi}` : 'Sin dato'} tone="red" />
        <MetricCard title="Músculo" value={muscleMass > 0 ? `${muscleMass} kg` : 'Sin dato'} tone="emerald" />
        <MetricCard title="Grasa" value={bodyFat > 0 ? `${bodyFat}%` : 'Sin dato'} tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleBodySubmit} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">{editingMetricId ? 'Editar medición corporal' : 'Registrar medición corporal'}</h2>
            </div>
            {loading && <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Fecha en que se tomó la medida</label>
              <input
                type="date"
                value={measurementDate}
                max={todayInputValue()}
                onChange={(e) => setMeasurementDate(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-600 font-mono"
                required
              />
            </div>
            <NumberField label="Peso (kg)" value={weight} setValue={setWeight} min={20} max={300} />
            <NumberField label="Estatura (cm)" value={height} setValue={setHeight} min={120} max={250} />
            <NumberField label="Edad" value={age} setValue={setAge} min={10} max={100} step={1} />
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Género</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as GenderValue | '')}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-600"
              >
                <option value="">Seleccionar</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <NumberField label="Masa muscular (kg)" value={muscleMass} setValue={setMuscleMass} min={5} max={150} />
            <NumberField label="Grasa corporal (%)" value={bodyFat} setValue={setBodyFat} min={2} max={70} />
            <NumberField label="Grasa visceral (1-20)" value={visceralFat} setValue={setVisceralFat} min={1} max={20} step={1} />
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Fuente de TMB</label>
              <select value={bmrSource} onChange={(e) => setBmrSource(e.target.value as BmrSourceValue)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-600">
                <option value="inbody">Valor del reporte InBody</option>
                <option value="mifflin_st_jeor">Calcular con Mifflin-St Jeor</option>
              </select>
            </div>
            <NumberField label={bmrSource === 'inbody' ? 'TMB InBody (kcal)' : 'TMB estimada (kcal)'} value={bmr} setValue={setBmr} min={500} max={6000} disabled={bmrSource === 'mifflin_st_jeor'} />
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">IMC automático</label>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white font-mono">{bmi}</div>
            </div>
            <div className="md:col-span-3 rounded-xl border border-neutral-800 bg-black/30 p-3 text-[11px] text-neutral-400 leading-relaxed">
              <span className="font-bold text-white">Referencia rápida:</span> selecciona el día exacto en que la persona se midió. Si se midió el 10 y lo registras el 20, la medición quedará fechada el 10 en Mis medidas, gráficas, historial y seguimiento general. La fuente de TMB queda registrada para que el plan use InBody cuando corresponde. La grasa visceral se maneja por nivel {visceralFat || 'sin dato'}/20: <span className="font-bold text-white">{visceralLevelLabel(visceralFat)}</span>.
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="submit" disabled={!activeClient || loading} className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> {editingMetricId ? 'Actualizar medición' : 'Guardar medición histórica'}
            </button>
            {editingMetricId && (
              <button type="button" onClick={cancelEdit} className="sm:w-40 border border-neutral-700 hover:border-neutral-500 text-neutral-200 font-bold text-xs py-3 rounded-xl transition-colors">
                Cancelar edición
              </button>
            )}
          </div>
        </form>

        <ChartPanel title="Evolución corporal" subtitle="Peso, masa muscular, grasa corporal e IMC por fecha">
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
                <Line type="monotone" dataKey="imc" stroke={chartTheme.sky} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart text="Registra tu primera medición para ver la evolución." />}
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Última medición registrada</h2>
          {latestMetric ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricCard title="Peso" value={`${latestMetric.weight} kg`} tone="white" />
              <MetricCard title="Músculo" value={`${latestMetric.muscle_mass} kg`} tone="emerald" />
              <MetricCard title="Grasa" value={`${latestMetric.body_fat}%`} tone="amber" />
              <MetricCard title="IMC" value={`${latestMetric.bmi || 0}`} tone="sky" />
              <MetricCard title="Visceral" value={`${latestMetric.visceral_fat || 0}/20`} tone="violet" />
              <MetricCard title="TMB" value={`${latestMetric.bmr || 0}`} tone="red" />
              <div className="col-span-2 md:col-span-3 rounded-xl border border-neutral-800 bg-black/30 p-3 text-[11px] text-neutral-400">
                Fecha de la medida: <span className="font-bold text-white">{shortDate(metricDate(latestMetric))}</span>
                {canSeeRecordedDate && latestMetric.recorded_at && latestMetric.recorded_at.slice(0, 10) !== metricDate(latestMetric).slice(0, 10) && (
                  <> · Registrada en la app: <span className="font-bold text-white">{shortDate(latestMetric.recorded_at)}</span></>
                )}
              </div>
            </div>
          ) : <div className="py-8 text-center text-xs text-neutral-500">Aún no hay mediciones registradas.</div>}
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Historial reciente de medidas</h2>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {[...bodyHistory].reverse().slice(0, 10).map(entry => (
              <div key={entry.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
                <div className="flex justify-between gap-3">
                  <span className="text-xs font-bold text-white">{shortDate(metricDate(entry))}</span>
                  <span className="text-xs text-red-400 font-mono">{entry.weight} kg</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                  Músculo {entry.muscle_mass} kg · Grasa {entry.body_fat}% · IMC {entry.bmi || 0}
                </p>
                {canSeeRecordedDate && entry.recorded_at && entry.recorded_at.slice(0, 10) !== metricDate(entry).slice(0, 10) && (
                  <p className="text-[10px] text-amber-300 mt-1">Registrada en la app: {shortDate(entry.recorded_at)}</p>
                )}
                <button
                  type="button"
                  onClick={() => loadMetricForEdit(entry)}
                  className="mt-2 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300"
                >
                  Editar valores o fecha
                </button>
              </div>
            ))}
            {bodyHistory.length === 0 && <div className="py-8 text-center text-xs text-neutral-500">No hay medidas registradas.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ title: string; value: string; tone: 'white' | 'red' | 'emerald' | 'amber' | 'sky' | 'violet' }> = ({ title, value, tone }) => {
  const tones = {
    white: 'text-white',
    red: 'text-red-500',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    sky: 'text-sky-400',
    violet: 'text-violet-400',
  };
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-xl">
      <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold block">{title}</span>
      <span className={`text-2xl font-black font-mono block mt-1 ${tones[tone]}`}>{value}</span>
    </div>
  );
};

const normalizeNumericText = (rawValue: string) => rawValue.trim().replace(',', '.');

const parseEditableNumber = (rawValue: string) => {
  const normalized = normalizeNumericText(rawValue);
  if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const clampMeasurementValue = (value: number, min?: number, max?: number, step?: number) => {
  const minSafe = min ?? -Infinity;
  const maxSafe = max ?? Infinity;
  const clamped = Math.min(maxSafe, Math.max(minSafe, value));
  return step === 1 ? Math.round(clamped) : Math.round(clamped * 10) / 10;
};

const NumberField: React.FC<{ label: string; value: number; setValue: (value: number) => void; step?: number; min?: number; max?: number; disabled?: boolean }> = ({ label, value, setValue, step = 0.1, min, max, disabled = false }) => {
  const [rawValue, setRawValue] = useState(String(value));

  useEffect(() => {
    setRawValue(String(value));
  }, [value]);

  const commitValue = (candidateValue: string) => {
    const parsed = parseEditableNumber(candidateValue);
    const fallback = Number.isFinite(value) ? value : min ?? 0;
    const next = clampMeasurementValue(parsed ?? fallback, min, max, step);
    setValue(next);
    setRawValue(String(next));
  };

  return (
    <div>
      <label className="text-[10px] text-neutral-400 uppercase block mb-1">{label}</label>
      <input
        type="text"
        inputMode={step === 1 ? 'numeric' : 'decimal'}
        pattern={step === 1 ? '[0-9]*' : '[0-9]*[.,]?[0-9]*'}
        value={rawValue}
        onChange={e => {
          const nextRawValue = e.target.value;
          const numericPattern = step === 1 ? /^\d*$/ : /^\d*([.,]\d*)?$/;
          if (!numericPattern.test(nextRawValue)) return;
          setRawValue(nextRawValue);
          const parsed = parseEditableNumber(nextRawValue);
          if (parsed !== null) {
            setValue(step === 1 ? Math.round(parsed) : parsed);
          }
        }}
        onBlur={() => commitValue(rawValue)}
        onFocus={e => e.currentTarget.select()}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            commitValue(rawValue);
          }
        }}
        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-600 font-mono"
        autoComplete="off"
        disabled={disabled}
        required
      />
    </div>
  );
};

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
