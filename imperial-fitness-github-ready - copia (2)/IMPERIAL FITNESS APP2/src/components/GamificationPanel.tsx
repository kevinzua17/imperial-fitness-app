import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  ChevronDown,
  Crown,
  Dumbbell,
  Edit3,
  Flame,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Zap,
} from 'lucide-react';
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
import type { ClientProfile } from '../data/mockData';
import { CollapsibleSection } from './CollapsibleSection';
import {
  HabitApi,
  HabitCategory,
  HabitInput,
  HabitTargetType,
  MyGamificationApi,
  GamificationPeriod,
  StrengthGoalApi,
  StrengthGoalInput,
  createHabitInApi,
  createStrengthGoalInApi,
  deleteHabitInApi,
  deleteStrengthGoalInApi,
  getMyGamificationFromApi,
  logStrengthGoalInApi,
  markGamificationNotificationReadFromApi,
  toggleHabitCompletionInApi,
  updateHabitInApi,
} from '../services/gamificationService';

const categoryLabels: Record<HabitCategory, string> = {
  training: 'Entrenamiento',
  nutrition: 'Nutrición',
  water: 'Agua',
  sleep: 'Sueño',
  mental: 'Mentalidad',
  mobility: 'Movilidad',
  gym: 'Gimnasio',
  custom: 'Personalizado',
};

const categoryAccent: Record<HabitCategory, string> = {
  training: 'from-red-500 to-orange-400',
  gym: 'from-yellow-400 to-red-500',
  nutrition: 'from-emerald-400 to-lime-300',
  water: 'from-sky-400 to-cyan-300',
  sleep: 'from-indigo-400 to-violet-300',
  mental: 'from-fuchsia-400 to-pink-400',
  mobility: 'from-teal-400 to-emerald-300',
  custom: 'from-neutral-300 to-neutral-500',
};

const categoryEmoji: Record<HabitCategory, string> = {
  training: '🏋️',
  gym: '💪',
  nutrition: '🥗',
  water: '💧',
  sleep: '🌙',
  mental: '🧘',
  mobility: '🧩',
  custom: '🎯',
};

const targetTypeLabels: Record<HabitTargetType, string> = {
  boolean: 'Check simple',
  number: 'Cantidad',
  weight: 'Peso',
  reps: 'Repeticiones',
  minutes: 'Minutos',
};

const suggestedHabits: HabitInput[] = [
  { title: 'GYM / entrenamiento del día', category: 'gym', target_type: 'boolean', target_value: 1, unit: 'check', frequency_days: 5 },
  { title: 'Subir técnica en sentadilla libre', category: 'gym', target_type: 'boolean', target_value: 1, unit: 'check', frequency_days: 3 },
  { title: 'Cumplir proteína del día', category: 'nutrition', target_type: 'boolean', target_value: 1, unit: 'check', frequency_days: 7 },
  { title: 'Tomar 2 litros de agua', category: 'water', target_type: 'number', target_value: 2, unit: 'L', frequency_days: 7 },
  { title: 'Dormir mínimo 7 horas', category: 'sleep', target_type: 'number', target_value: 7, unit: 'h', frequency_days: 7 },
  { title: 'Movilidad o estiramiento', category: 'mobility', target_type: 'minutes', target_value: 10, unit: 'min', frequency_days: 5 },
  { title: 'No alcohol', category: 'nutrition', target_type: 'boolean', target_value: 1, unit: 'check', frequency_days: 7 },
  { title: 'Leer 10 páginas', category: 'mental', target_type: 'number', target_value: 10, unit: 'pág', frequency_days: 5 },
];

const defaultHabitForm: HabitInput = {
  title: '',
  category: 'gym',
  target_type: 'boolean',
  target_value: 1,
  unit: 'check',
  frequency_days: 7,
};

const defaultStrengthForm: StrengthGoalInput = {
  exercise_name: '',
  base_weight_kg: 0,
  target_weight_kg: 0,
  target_reps: 8,
  increment_kg: 2.5,
};

const gamificationPeriodOptions: { key: GamificationPeriod; label: string; helper: string }[] = [
  { key: '7d', label: 'Semanal', helper: '7 días' },
  { key: 'current_month', label: 'Este mes', helper: 'calendario' },
  { key: 'previous_month', label: 'Mes pasado', helper: 'calendario' },
  { key: '30d', label: 'Últimos 30 días', helper: 'móvil' },
  { key: '90d', label: 'Trimestral', helper: '3 meses' },
  { key: '180d', label: 'Semestral', helper: '6 meses' },
  { key: '365d', label: 'Anual', helper: '12 meses' },
];

function periodLabel(period?: string) {
  return gamificationPeriodOptions.find((item) => item.key === period)?.label.toLowerCase() || 'periodo';
}

function formatShortDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function periodTargetForHabit(habit: HabitApi, fallbackDays = 7) {
  if (typeof habit.period_target === 'number' && Number.isFinite(habit.period_target)) return Math.max(1, habit.period_target);
  return Math.max(1, Math.round(Number(habit.frequency_days || 7) * Math.max(1, fallbackDays / 7)));
}

function localDateKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function xpForNextLevel(level: number) {
  return level * 250;
}

function numberValue(value: string | number | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function formatKg(value?: number | null) {
  if (value === undefined || value === null) return '—';
  return `${Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 1)} kg`;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  helper?: string;
  tone?: 'red' | 'yellow' | 'emerald' | 'sky' | 'neutral';
}

function MetricCard({ label, value, helper, tone = 'neutral' }: MetricCardProps) {
  const toneClass = {
    red: 'border-red-500/30 bg-red-950/20 text-red-200',
    yellow: 'border-yellow-400/30 bg-yellow-950/20 text-yellow-200',
    emerald: 'border-emerald-400/30 bg-emerald-950/20 text-emerald-200',
    sky: 'border-sky-400/30 bg-sky-950/20 text-sky-200',
    neutral: 'border-neutral-700 bg-black/25 text-white',
  }[tone];

  return (
    <div className={cx('rounded-2xl border p-4 shadow-xl shadow-black/20', toneClass)}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
      {helper && <p className="mt-1 text-[10px] font-semibold text-neutral-500">{helper}</p>}
    </div>
  );
}

function RadialProgress({ percent, label, detail }: { percent: number; label: string; detail: string }) {
  const safePercent = clampPercent(percent);
  return (
    <div className="rounded-[2rem] border border-neutral-800 bg-neutral-950/90 p-5 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-300">{label}</p>
          <h3 className="mt-1 text-lg font-black text-white">{detail}</h3>
        </div>
        <BarChart3 className="h-6 w-6 text-fuchsia-300" />
      </div>
      <div className="mt-5 flex items-center justify-center">
        <div
          className="relative flex h-36 w-36 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(#ec4899 ${safePercent * 3.6}deg, #1f2937 0deg)` }}
        >
          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border border-neutral-800 bg-neutral-950">
            <span className="text-3xl font-black text-white">{safePercent}%</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">progreso</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LevelProgress({ data }: { data: MyGamificationApi }) {
  const status = data.status;
  const progress = useMemo(() => {
    const previous = Math.max(0, (status.level - 1) * 250);
    const next = xpForNextLevel(status.level);
    return clampPercent(((status.xp - previous) / Math.max(1, next - previous)) * 100);
  }, [status.level, status.xp]);

  return (
    <div className="rounded-[2rem] border border-yellow-500/20 bg-gradient-to-br from-neutral-950 via-neutral-950 to-yellow-950/20 p-5 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-yellow-300 font-black">Nivel Imperial</p>
          <p className="mt-1 text-2xl font-black text-white">Nivel {status.level}</p>
          <p className="text-sm font-bold text-yellow-200">{status.title}</p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-500/10">
          <Crown className="h-7 w-7 text-yellow-300" />
        </div>
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-neutral-500">
          <span>{status.xp} XP</span>
          <span>{progress}% al siguiente nivel</span>
        </div>
        <div className="h-4 overflow-hidden rounded-full border border-neutral-800 bg-neutral-900">
          <div className="h-full rounded-full bg-gradient-to-r from-red-500 via-fuchsia-500 to-yellow-300 shadow-[0_0_25px_rgba(236,72,153,0.45)]" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border border-neutral-800 bg-black/30 p-3">
          <p className="text-xl font-black text-yellow-200">{status.imperial_coins}</p>
          <p className="text-[9px] uppercase tracking-wider text-neutral-500">monedas</p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-black/30 p-3">
          <p className="text-xl font-black text-sky-200">{status.streak_shields}</p>
          <p className="text-[9px] uppercase tracking-wider text-neutral-500">escudos</p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-black/30 p-3">
          <p className="text-xl font-black text-fuchsia-200">{status.prestige || 0}</p>
          <p className="text-[9px] uppercase tracking-wider text-neutral-500">prestigio</p>
        </div>
      </div>
    </div>
  );
}

function WeeklyBars({ data }: { data: MyGamificationApi }) {
  const summary = data.weekly_summary;
  return (
    <div className="rounded-[2rem] border border-cyan-400/20 bg-gradient-to-br from-neutral-950 via-neutral-950 to-cyan-950/20 p-5 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300 font-black">Progreso {summary.period_label || periodLabel(summary.period)}</p>
          <h3 className="mt-1 text-2xl font-black text-white">{summary.completed_habit_slots}/{summary.total_habit_slots}</h3>
          <p className="text-[11px] text-neutral-500">terminados vs meta del periodo</p>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xl font-black text-cyan-200">{summary.completion_percent}%</div>
      </div>
      <div className="mt-5 h-44 overflow-x-auto rounded-2xl border border-neutral-800 bg-black/25 p-3">
        <div className="flex h-full items-end gap-2" style={{ minWidth: summary.days.length > 31 ? `${summary.days.length * 32}px` : undefined }}>
        {summary.days.map((day) => (
          <div key={day.date} className="flex h-full min-w-[24px] flex-1 flex-col items-center justify-end gap-2">
            <div className="relative flex h-full w-full items-end justify-center rounded-xl bg-neutral-900/80">
              <div
                className="w-full rounded-xl bg-gradient-to-t from-cyan-500 to-fuchsia-400 shadow-[0_0_18px_rgba(34,211,238,0.25)]"
                style={{ height: `${clampPercent(day.percent)}%` }}
              />
              <span className="absolute top-2 text-[9px] font-black text-white">{day.completed}</span>
            </div>
            <span className="text-[10px] font-black uppercase text-neutral-400">{day.label}</span>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}

function CategoryProgress({ habits }: { habits: HabitApi[] }) {
  const rows = useMemo(() => {
    const grouped = habits.reduce<Record<string, { category: HabitCategory; completed: number; total: number }>>((acc, habit) => {
      if (habit.active !== 1) return acc;
      const current = acc[habit.category] || { category: habit.category, completed: 0, total: 0 };
      current.completed += Number(habit.weekly_completed || 0);
      current.total += periodTargetForHabit(habit);
      acc[habit.category] = current;
      return acc;
    }, {});
    return Object.values(grouped)
      .map((item) => ({ ...item, percent: clampPercent((item.completed / Math.max(1, item.total)) * 100) }))
      .sort((a, b) => b.percent - a.percent);
  }, [habits]);

  return (
    <div className="rounded-[2rem] border border-neutral-800 bg-neutral-950/90 p-5 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-300 font-black">Categorías</p>
          <h3 className="text-lg font-black text-white">Disciplina por área</h3>
        </div>
        <Target className="h-6 w-6 text-emerald-300" />
      </div>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? <p className="text-xs text-neutral-500">Crea tus primeros hábitos para ver gráficas.</p> : rows.map((row) => (
          <div key={row.category}>
            <div className="mb-1 flex items-center justify-between text-[11px] font-bold">
              <span className="text-neutral-200">{categoryEmoji[row.category]} {categoryLabels[row.category]}</span>
              <span className="text-neutral-500">{row.completed}/{row.total} · {row.percent}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-neutral-800">
              <div className={cx('h-full rounded-full bg-gradient-to-r', categoryAccent[row.category])} style={{ width: `${row.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface HabitEditorProps {
  habit: HabitApi | null;
  onCancel: () => void;
  onSave: (payload: HabitInput | (Partial<HabitInput> & { active?: number })) => Promise<void>;
  saving: boolean;
}

function HabitEditor({ habit, onCancel, onSave, saving }: HabitEditorProps) {
  const [form, setForm] = useState<HabitInput>(() => habit ? {
    title: habit.title,
    category: habit.category,
    target_type: habit.target_type,
    target_value: habit.target_value,
    unit: habit.unit,
    frequency_days: habit.frequency_days,
  } : defaultHabitForm);

  useEffect(() => {
    setForm(habit ? {
      title: habit.title,
      category: habit.category,
      target_type: habit.target_type,
      target_value: habit.target_value,
      unit: habit.unit,
      frequency_days: habit.frequency_days,
    } : defaultHabitForm);
  }, [habit]);

  return (
    <div className="rounded-[1.5rem] border border-fuchsia-500/30 bg-fuchsia-950/10 p-4 shadow-xl shadow-black/20">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
        <input
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="Ej. Subir 10 kg a sentadilla libre"
          className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-fuchsia-500 md:col-span-2"
        />
        <select
          value={form.category}
          onChange={(event) => setForm({ ...form, category: event.target.value as HabitCategory })}
          className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-white outline-none focus:border-fuchsia-500"
        >
          {(Object.keys(categoryLabels) as HabitCategory[]).map((key) => <option key={key} value={key}>{categoryLabels[key]}</option>)}
        </select>
        <select
          value={form.target_type}
          onChange={(event) => setForm({ ...form, target_type: event.target.value as HabitTargetType })}
          className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-white outline-none focus:border-fuchsia-500"
        >
          {(Object.keys(targetTypeLabels) as HabitTargetType[]).map((key) => <option key={key} value={key}>{targetTypeLabels[key]}</option>)}
        </select>
        <input
          type="number"
          min="0"
          value={form.target_value ?? 1}
          onChange={(event) => setForm({ ...form, target_value: numberValue(event.target.value, 1) })}
          className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-white outline-none focus:border-fuchsia-500"
        />
        <input
          value={form.unit || ''}
          onChange={(event) => setForm({ ...form, unit: event.target.value })}
          placeholder="kg/min/check"
          className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-fuchsia-500"
        />
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={saving || !form.title.trim()}
          onClick={() => onSave(form)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-red-500 px-4 py-2.5 text-xs font-black text-white hover:from-fuchsia-500 hover:to-red-400 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {habit ? 'Guardar cambios' : 'Agregar hábito'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-xs font-bold text-neutral-300 hover:text-white">
          Cancelar
        </button>
      </div>
    </div>
  );
}

interface HabitHeatmapProps {
  data: MyGamificationApi;
  values: Record<number, string>;
  setValues: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  onToggle: (habit: HabitApi, completed?: boolean, date?: string, currentValue?: number) => Promise<void>;
  onUpdate: (habit: HabitApi, payload: Partial<HabitInput> & { active?: number }) => Promise<void>;
  onDelete: (habit: HabitApi) => Promise<void>;
  saving: boolean;
}

function HabitHeatmap({ data, values, setValues, onToggle, onUpdate, onDelete, saving }: HabitHeatmapProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const activeHabits = data.habits.filter((habit) => habit.active === 1);
  const todayKey = localDateKey();
  const days = data.weekly_summary.days;
  const fallbackDays = Math.max(1, days.length || 7);
  const visiblePeriodLabel = data.weekly_summary.period_label || periodLabel(data.weekly_summary.period);
  const isLongPeriod = days.length > 31;
  const cellWidth = days.length <= 7 ? 70 : 42;
  const gridTemplateColumns = `300px 90px repeat(${days.length}, ${cellWidth}px) 130px 92px`;
  const minGridWidth = Math.max(980, 612 + (days.length * cellWidth));

  const getGrid = (habit: HabitApi) => habit.weekly_grid && habit.weekly_grid.length > 0
    ? habit.weekly_grid
    : days.map((day) => ({ date: day.date, label: day.label, completed: day.date === todayKey ? Boolean(habit.completed_today) : false, current_value: 0, is_today: day.date === todayKey }));

  const getHabitStats = (habit: HabitApi) => {
    const grid = getGrid(habit);
    const completed = Number(habit.weekly_completed || grid.filter((cell) => cell.completed).length || 0);
    const total = periodTargetForHabit(habit, fallbackDays);
    const progress = clampPercent((completed / Math.max(1, total)) * 100);
    const value = values[habit.id] ?? String(habit.current_value_today || habit.target_value || 0);
    return { grid, completed, total, progress, value };
  };

  const markLabel = (habit: HabitApi) => habit.target_type === 'boolean'
    ? 'Toca un día para marcarlo'
    : `Escribe tu valor y toca el día (${habit.unit})`;

  const renderCell = (habit: HabitApi, cell: NonNullable<HabitApi['weekly_grid']>[number], value: string, compact = false) => {
    const isCompleted = Boolean(cell.completed);
    const isToday = cell.date === todayKey;
    return (
      <button
        type="button"
        disabled={saving}
        onClick={() => onToggle(habit, !isCompleted, cell.date, habit.target_type === 'boolean' ? habit.target_value : numberValue(value, habit.target_value))}
        className={cx(
          'group relative flex flex-col items-center justify-center rounded-2xl border font-black transition active:scale-95 disabled:opacity-60',
          compact ? 'h-11 w-11 text-[9px]' : 'h-12 w-full px-1 text-[9px]',
          isCompleted
            ? 'border-fuchsia-300 bg-gradient-to-br from-fuchsia-500 via-pink-500 to-yellow-300 text-white shadow-[0_0_18px_rgba(236,72,153,0.35)]'
            : 'border-fuchsia-500/35 bg-neutral-950 text-neutral-500 hover:border-fuchsia-300 hover:bg-fuchsia-500/10 hover:text-fuchsia-100',
          isToday && 'ring-2 ring-cyan-300/70'
        )}
        aria-label={`${isCompleted ? 'Desmarcar' : 'Marcar'} ${habit.title} ${cell.label}`}
      >
        <span className="leading-none">{cell.label}</span>
        <span className={cx('mt-0.5 text-[9px] leading-none', isCompleted ? 'text-white/90' : 'text-neutral-700')}>{cell.date.slice(8)}</span>
        <span className="mt-1 flex h-4 w-4 items-center justify-center rounded-md border border-white/20 bg-black/20">
          {isCompleted ? <Check className="h-3.5 w-3.5" /> : ''}
        </span>
      </button>
    );
  };

  return (
    <div className="rounded-[2rem] border border-neutral-800 bg-neutral-950/95 p-4 shadow-2xl shadow-black/30 md:p-5">
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-300">Calendario de constancia</p>
          <h3 className="text-xl font-black text-white">Matriz de hábitos</h3>
          <p className="mt-1 text-[11px] text-neutral-500">Filtra por semana, mes, trimestre, semestre o año. Cada cuadro suma a tu racha, tu progreso y tu nivel.</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-fuchsia-200">Vista {visiblePeriodLabel}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-2">
            <p className="text-lg font-black text-white">{data.weekly_summary.completed_habit_slots}</p>
            <p className="text-[9px] font-black uppercase tracking-wider text-fuchsia-200">hechos</p>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2">
            <p className="text-lg font-black text-white">{data.weekly_summary.remaining_habit_slots}</p>
            <p className="text-[9px] font-black uppercase tracking-wider text-cyan-200">faltan</p>
          </div>
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2">
            <p className="text-lg font-black text-white">{data.weekly_summary.completion_percent}%</p>
            <p className="text-[9px] font-black uppercase tracking-wider text-yellow-200">{visiblePeriodLabel}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-[1.5rem] border border-neutral-800 bg-black/25 p-3">
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-neutral-400">
          <span className="inline-flex items-center gap-1"><span className="h-4 w-4 rounded-md border border-fuchsia-300 bg-fuchsia-500" /> Cumplido</span>
          <span className="inline-flex items-center gap-1"><span className="h-4 w-4 rounded-md border border-fuchsia-500/35 bg-neutral-950" /> Pendiente</span>
          <span className="inline-flex items-center gap-1"><span className="h-4 w-4 rounded-md border border-cyan-300 ring-2 ring-cyan-300/70" /> Hoy</span>
          <span className="text-neutral-600">Consejo: usa el desplazamiento lateral para revisar periodos largos sin cargar todo el historial.</span>
        </div>
      </div>

      {activeHabits.length === 0 && <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 text-center text-xs text-neutral-500">Aún no hay hábitos activos. Agrega o activa hábitos para comenzar el Camino Imperial.</div>}

      <div className="space-y-3 lg:hidden">
        {activeHabits.map((habit) => {
          if (editingId === habit.id) {
            return <HabitEditor key={habit.id} habit={habit} saving={saving} onCancel={() => setEditingId(null)} onSave={async (payload) => { await onUpdate(habit, payload as Partial<HabitInput>); setEditingId(null); }} />;
          }
          const { grid, completed, total, progress, value } = getHabitStats(habit);
          return (
            <div key={habit.id} className="rounded-[1.5rem] border border-neutral-800 bg-black/25 p-4 shadow-xl shadow-black/20">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{categoryEmoji[habit.category]}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{habit.title}</p>
                      <p className="text-[10px] font-semibold text-neutral-500">{categoryLabels[habit.category]} · racha {habit.current_streak || 0} días</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-fuchsia-100">{completed}/{total}</p>
                  <p className="text-[9px] uppercase tracking-wider text-neutral-500">meta</p>
                </div>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-neutral-800">
                <div className={cx('h-full rounded-full bg-gradient-to-r', categoryAccent[habit.category])} style={{ width: `${progress}%` }} />
              </div>

              {habit.target_type !== 'boolean' && (
                <label className="mt-3 block">
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Valor a registrar</span>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      value={value}
                      onChange={(event) => setValues((prev) => ({ ...prev, [habit.id]: event.target.value }))}
                      className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-sm font-black text-white outline-none focus:border-fuchsia-500"
                      placeholder={`${habit.target_value}`}
                    />
                    <span className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-xs font-black text-neutral-300">{habit.unit}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-neutral-600">Meta del hábito: {habit.target_value} {habit.unit}</p>
                </label>
              )}

              <div className="mt-3 overflow-x-auto pb-1">
                <div className={cx('grid gap-1.5', isLongPeriod ? 'min-w-max' : 'grid-cols-7')} style={isLongPeriod ? { gridTemplateColumns: `repeat(${grid.length}, 44px)` } : undefined}>
                  {grid.map((cell) => <div key={`${habit.id}-${cell.date}`} className="flex justify-center">{renderCell(habit, cell, value, isLongPeriod)}</div>)}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold text-neutral-500">{markLabel(habit)}</p>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setEditingId(habit.id)} className="rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-neutral-400 hover:text-white" aria-label="Editar hábito"><Edit3 className="h-4 w-4" /></button>
                  <button type="button" onClick={() => onDelete(habit)} className="rounded-xl border border-red-900/50 bg-red-950/20 p-2 text-red-300 hover:text-red-100" aria-label="Eliminar hábito"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-neutral-800 bg-black/20 lg:block">
        <div style={{ minWidth: `${minGridWidth}px` }}>
          <div className="grid items-center border-b border-neutral-800 bg-neutral-900/80 px-3 py-3 text-[10px] font-black uppercase tracking-wider text-neutral-400" style={{ gridTemplateColumns }}>
            <div>Hábito</div>
            <div className="text-center">Meta</div>
            {days.map((day) => <div key={day.date} className="text-center"><span className={cx(day.date === todayKey && 'text-cyan-300')}>{day.label}</span><br /><span className="text-[9px] text-neutral-600">{day.date.slice(8)}</span></div>)}
            <div className="text-center">Progreso</div>
            <div className="text-center">Acciones</div>
          </div>

          {activeHabits.map((habit) => {
            if (editingId === habit.id) {
              return (
                <div key={habit.id} className="border-b border-neutral-800 p-3">
                  <HabitEditor habit={habit} saving={saving} onCancel={() => setEditingId(null)} onSave={async (payload) => { await onUpdate(habit, payload as Partial<HabitInput>); setEditingId(null); }} />
                </div>
              );
            }
            const { grid, completed, total, progress, value } = getHabitStats(habit);
            return (
              <div key={habit.id} className="grid items-center border-b border-neutral-800/80 px-3 py-3 hover:bg-neutral-900/40" style={{ gridTemplateColumns }}>
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{categoryEmoji[habit.category]}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{habit.title}</p>
                      <p className="text-[10px] font-semibold text-neutral-500">{categoryLabels[habit.category]} · racha {habit.current_streak || 0} días</p>
                    </div>
                  </div>
                </div>
                <div className="text-center text-xs font-black text-neutral-300">{habit.target_type === 'boolean' ? total : `${habit.target_value} ${habit.unit}`}</div>
                {grid.map((cell) => <div key={`${habit.id}-${cell.date}`} className="flex justify-center">{renderCell(habit, cell, value, true)}</div>)}
                <div className="px-2">
                  <div className="mb-1 text-center text-[10px] font-black text-neutral-400">{completed}/{total} · {progress}%</div>
                  <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
                    <div className={cx('h-full rounded-full bg-gradient-to-r', categoryAccent[habit.category])} style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="flex justify-center gap-1.5">
                  <button type="button" onClick={() => setEditingId(habit.id)} className="rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-neutral-400 hover:text-white" aria-label="Editar hábito"><Edit3 className="h-4 w-4" /></button>
                  <button type="button" onClick={() => onDelete(habit)} className="rounded-xl border border-red-900/50 bg-red-950/20 p-2 text-red-300 hover:text-red-100" aria-label="Eliminar hábito"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {activeHabits.filter((habit) => habit.target_type !== 'boolean').slice(0, 3).map((habit) => (
          <div key={habit.id} className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Registro rápido</p>
            <p className="mt-1 truncate text-xs font-black text-white">{habit.title}</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                value={values[habit.id] ?? String(habit.current_value_today || habit.target_value || 0)}
                onChange={(event) => setValues((prev) => ({ ...prev, [habit.id]: event.target.value }))}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-xs text-white outline-none focus:border-fuchsia-500"
                placeholder={`${habit.target_value}`}
              />
              <span className="text-[11px] font-bold text-neutral-500">{habit.unit}</span>
              <button type="button" disabled={saving} onClick={() => onToggle(habit, true, todayKey, numberValue(values[habit.id], habit.target_value))} className="rounded-xl bg-fuchsia-600 px-3 py-2.5 text-[10px] font-black text-white hover:bg-fuchsia-500 disabled:opacity-50">Guardar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface HabitsSectionProps {
  data: MyGamificationApi;
  values: Record<number, string>;
  setValues: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  onToggle: (habit: HabitApi, completed?: boolean, date?: string, currentValue?: number) => Promise<void>;
  onCreate: (payload: HabitInput) => Promise<void>;
  onUpdate: (habit: HabitApi, payload: Partial<HabitInput> & { active?: number }) => Promise<void>;
  onDelete: (habit: HabitApi) => Promise<void>;
  saving: boolean;
}

function HabitsSection({ data, values, setValues, onToggle, onCreate, onUpdate, onDelete, saving }: HabitsSectionProps) {
  const [adding, setAdding] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inactiveHabits = data.habits.filter((habit) => habit.active !== 1);

  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border border-neutral-800 bg-neutral-950/90 p-5 shadow-2xl shadow-black/30">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-red-400 font-black">Constructor de hábitos</p>
            <h3 className="text-xl font-black text-white">Edita tu Camino Imperial</h3>
            <p className="mt-1 text-[11px] text-neutral-500">Construye hábitos diarios, metas de gimnasio y disciplina semanal en un solo lugar.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setShowSuggestions((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-2.5 text-xs font-black text-fuchsia-100 hover:bg-fuchsia-500/20">
              <Sparkles className="h-4 w-4" /> Sugeridos
            </button>
            <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-fuchsia-600 px-4 py-2.5 text-xs font-black text-white hover:from-red-500 hover:to-fuchsia-500">
              <Plus className="h-4 w-4" /> Nuevo hábito
            </button>
          </div>
        </div>

        {adding && <div className="mt-4"><HabitEditor habit={null} saving={saving} onCancel={() => setAdding(false)} onSave={async (payload) => { await onCreate(payload as HabitInput); setAdding(false); }} /></div>}

        {showSuggestions && (
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {suggestedHabits.map((habit) => (
              <button
                type="button"
                key={habit.title}
                disabled={saving}
                onClick={() => onCreate(habit)}
                className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-3 text-left hover:border-fuchsia-400/70 disabled:opacity-50"
              >
                <p className="text-sm font-black text-white">{categoryEmoji[habit.category]} {habit.title}</p>
                <p className="mt-1 text-[10px] text-neutral-500">{categoryLabels[habit.category]} · meta {habit.target_value} {habit.unit}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <HabitHeatmap data={data} values={values} setValues={setValues} onToggle={onToggle} onUpdate={onUpdate} onDelete={onDelete} saving={saving} />

      {inactiveHabits.length > 0 && (
        <details className="group rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold text-neutral-300">
            Hábitos desactivados
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {inactiveHabits.map((habit) => (
              <div key={habit.id} className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
                <p className="text-xs text-neutral-400">{habit.title}</p>
                <button type="button" onClick={() => onUpdate(habit, { active: 1 })} className="rounded-xl bg-neutral-800 px-3 py-1.5 text-[10px] font-black text-white hover:bg-neutral-700">Reactivar</button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

interface TopHabitsProps { habits: HabitApi[]; }

function TopHabits({ habits }: TopHabitsProps) {
  const rows = habits
    .filter((habit) => habit.active === 1)
    .map((habit) => {
      const completed = Number(habit.weekly_completed || 0);
      const total = periodTargetForHabit(habit);
      return { habit, completed, total, remaining: Math.max(0, total - completed), percent: clampPercent((completed / Math.max(1, total)) * 100) };
    })
    .sort((a, b) => b.percent - a.percent || b.completed - a.completed)
    .slice(0, 10);

  return (
    <div className="rounded-[2rem] border border-neutral-800 bg-neutral-950/90 p-5 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-yellow-300 font-black">Los 10 mejores</p>
          <h3 className="text-lg font-black text-white">Ranking semanal</h3>
        </div>
        <Trophy className="h-6 w-6 text-yellow-300" />
      </div>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? <p className="text-xs text-neutral-500">Todavía no hay hábitos para ordenar.</p> : rows.map((row, index) => (
          <div key={row.habit.id} className="grid grid-cols-[28px_1fr_48px_48px_64px] items-center gap-2 text-[11px]">
            <div className="font-black text-neutral-500">{index + 1}</div>
            <div className="min-w-0">
              <p className="truncate font-black text-white">{categoryEmoji[row.habit.category]} {row.habit.title}</p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-800">
                <div className={cx('h-full rounded-full bg-gradient-to-r', categoryAccent[row.habit.category])} style={{ width: `${row.percent}%` }} />
              </div>
            </div>
            <div className="text-center font-black text-emerald-300">{row.completed}</div>
            <div className="text-center font-black text-red-300">{row.remaining}</div>
            <div className="text-right font-black text-fuchsia-200">{row.percent}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface StrengthSectionProps {
  goals: StrengthGoalApi[];
  onCreate: (payload: StrengthGoalInput) => Promise<void>;
  onLog: (goal: StrengthGoalApi, payload: { weight_kg: number; reps: number; sets: number; rir?: number; note?: string }) => Promise<void>;
  onDelete: (goal: StrengthGoalApi) => Promise<void>;
  saving: boolean;
}

function StrengthSection({ goals, onCreate, onLog, onDelete, saving }: StrengthSectionProps) {
  const [adding, setAdding] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [form, setForm] = useState<StrengthGoalInput>(defaultStrengthForm);
  const [logs, setLogs] = useState<Record<number, { weight_kg: string; reps: string; sets: string; rir: string }>>({});

  const ensureLog = (goal: StrengthGoalApi) => logs[goal.id] || {
    weight_kg: String(goal.next_weight_kg || goal.current_weight_kg || goal.base_weight_kg),
    reps: String(goal.target_reps || 8),
    sets: '3',
    rir: '2',
  };

  const FieldHelp = ({ label, help }: { label: string; help: string }) => (
    <div className="mb-1.5">
      <p className="text-[10px] font-black uppercase tracking-wider text-neutral-300">{label}</p>
      <p className="text-[9px] font-semibold text-neutral-600">{help}</p>
    </div>
  );

  return (
    <div className="rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-neutral-950 via-neutral-950 to-yellow-950/20 p-5 shadow-2xl shadow-black/30">
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-yellow-300 font-black">Progresión de cargas</p>
          <h3 className="text-xl font-black text-white">Entrenador Imperial</h3>
          <p className="mt-1 max-w-2xl text-[11px] text-neutral-500">Registra tus cargas de entrenamiento de forma simple. La app te dirá si conviene subir peso, repetir la misma carga o ajustar la intensidad.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => setShowCharts((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 px-4 py-2.5 text-xs font-black text-yellow-100 hover:bg-yellow-500/20">
            <BarChart3 className="h-4 w-4" /> {showCharts ? 'Ocultar gráfica' : 'Ver gráfica'}
          </button>
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-neutral-950 hover:bg-yellow-300">
            <Plus className="h-4 w-4" /> Nueva meta
          </button>
        </div>
      </div>

      {adding && (
        <div className="mb-4 rounded-[1.5rem] border border-yellow-500/30 bg-yellow-950/10 p-4">
          <div className="mb-3 rounded-2xl border border-yellow-400/15 bg-black/20 p-3">
            <p className="text-xs font-black text-yellow-100">Crea una meta de fuerza</p>
            <p className="mt-1 text-[11px] text-neutral-500">Ejemplo: si hoy haces sentadilla con 60 kg y quieres llegar a 70 kg, coloca 60 en peso actual y 70 en peso meta.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <label className="md:col-span-2">
              <FieldHelp label="Ejercicio o meta" help="Nombre claro para identificar el objetivo" />
              <input value={form.exercise_name} onChange={(event) => setForm({ ...form, exercise_name: event.target.value })} placeholder="Sentadilla libre +10 kg" className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-yellow-400" />
            </label>
            <label>
              <FieldHelp label="Peso actual" help="Carga con la que empiezas" />
              <input type="number" value={form.base_weight_kg} onChange={(event) => setForm({ ...form, base_weight_kg: numberValue(event.target.value) })} placeholder="60" className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-white outline-none focus:border-yellow-400" />
            </label>
            <label>
              <FieldHelp label="Peso meta" help="Carga que quieres lograr" />
              <input type="number" value={form.target_weight_kg} onChange={(event) => setForm({ ...form, target_weight_kg: numberValue(event.target.value) })} placeholder="70" className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-white outline-none focus:border-yellow-400" />
            </label>
            <label>
              <FieldHelp label="Reps objetivo" help="Repeticiones para validar avance" />
              <input type="number" value={form.target_reps || 8} onChange={(event) => setForm({ ...form, target_reps: Math.round(numberValue(event.target.value, 8)) })} placeholder="8" className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-white outline-none focus:border-yellow-400" />
            </label>
            <label>
              <FieldHelp label="Subida por sesión" help="Ej. 2.5 kg o 5 kg" />
              <input type="number" value={form.increment_kg} onChange={(event) => setForm({ ...form, increment_kg: numberValue(event.target.value, 2.5) })} placeholder="2.5" className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-white outline-none focus:border-yellow-400" />
            </label>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="button" disabled={saving || !form.exercise_name.trim()} onClick={async () => { await onCreate(form); setForm(defaultStrengthForm); setAdding(false); }} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-neutral-950 hover:bg-yellow-300 disabled:opacity-50"><Save className="h-4 w-4" /> Crear meta</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-xs font-bold text-neutral-300 hover:text-white">Cancelar</button>
          </div>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-neutral-800 bg-black/25 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-yellow-300">Peso usado</p>
          <p className="mt-1 text-[11px] text-neutral-500">El peso real que levantaste en esa serie o bloque.</p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-black/25 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-yellow-300">Reps logradas</p>
          <p className="mt-1 text-[11px] text-neutral-500">Cuántas repeticiones completaste con buena técnica.</p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-black/25 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-yellow-300">Series</p>
          <p className="mt-1 text-[11px] text-neutral-500">Cuántas series hiciste con esa carga.</p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-black/25 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-yellow-300">RIR</p>
          <p className="mt-1 text-[11px] text-neutral-500">Reps en reserva: 0 = al límite, 1–2 = intenso, 3+ = con margen.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {goals.length === 0 && <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 text-center text-xs text-neutral-500 xl:col-span-2">Crea una meta como “subir 10 kg a sentadilla libre” para activar el entrenador.</div>}
        {goals.map((goal) => {
          const log = ensureLog(goal);
          const remaining = Math.max(0, Number(goal.target_weight_kg || 0) - Number(goal.current_weight_kg || 0));
          const coachHint = goal.suggestion || 'Registra tu próxima sesión para recibir una recomendación de carga.';
          const chartData = (goal.period_logs || []).map((entry) => ({
            date: formatShortDate(entry.created_at),
            carga: Number(entry.weight_kg || 0),
            reps: Number(entry.reps || 0),
            volumen: Math.round(Number(entry.weight_kg || 0) * Number(entry.reps || 0) * Number(entry.sets || 1)),
          }));
          return (
            <div key={goal.id} className="rounded-[1.5rem] border border-neutral-800 bg-black/25 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5 text-yellow-300" />
                    <p className="truncate text-base font-black text-white">{goal.exercise_name}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500">Inicio {formatKg(goal.base_weight_kg)} · Actual {formatKg(goal.current_weight_kg)} · Meta {formatKg(goal.target_weight_kg)}</p>
                </div>
                <span className={cx('rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider', goal.status === 'completed' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-yellow-500/15 text-yellow-200')}>{goal.status === 'completed' ? 'completada' : 'activa'}</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
                  <p className="text-lg font-black text-white">{goal.progress_percent}%</p>
                  <p className="text-[9px] uppercase text-neutral-500">avance hacia la meta</p>
                </div>
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
                  <p className="text-lg font-black text-yellow-200">{formatKg(goal.next_weight_kg)}</p>
                  <p className="text-[9px] uppercase text-neutral-500">próxima carga sugerida</p>
                </div>
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
                  <p className="text-lg font-black text-red-200">{formatKg(remaining)}</p>
                  <p className="text-[9px] uppercase text-neutral-500">faltan para la meta</p>
                </div>
              </div>

              <div className="mt-4 h-4 overflow-hidden rounded-full border border-neutral-800 bg-neutral-900">
                <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 shadow-[0_0_20px_rgba(250,204,21,0.35)]" style={{ width: `${clampPercent(goal.progress_percent)}%` }} />
              </div>
              <div className="mt-3 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-yellow-300">Recomendación del entrenador</p>
                <p className="mt-1 text-[11px] font-semibold text-yellow-100/90">{coachHint}</p>
              </div>

              {showCharts && (
                <div className="mt-3 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-yellow-300">Gráfica de cargas</p>
                      <p className="text-[11px] text-neutral-500">Se actualiza con cada registro guardado en este periodo.</p>
                    </div>
                    <span className="rounded-full border border-neutral-800 bg-black/30 px-2 py-1 text-[10px] font-black text-neutral-300">{chartData.length} registros</span>
                  </div>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={chartData}>
                        <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
                        <XAxis dataKey="date" stroke="#a3a3a3" fontSize={10} />
                        <YAxis stroke="#a3a3a3" fontSize={10} />
                        <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: 12, color: '#fff' }} />
                        <Legend />
                        <Line type="monotone" dataKey="carga" stroke="#facc15" strokeWidth={3} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="reps" stroke="#fb7185" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="volumen" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="rounded-xl border border-neutral-800 bg-black/25 p-4 text-center text-xs text-neutral-500">Guarda entrenamientos para construir la gráfica de este ejercicio.</div>
                  )}
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                <label>
                  <FieldHelp label="Peso usado" help="kg levantados" />
                  <input type="number" value={log.weight_kg} onChange={(event) => setLogs((prev) => ({ ...prev, [goal.id]: { ...log, weight_kg: event.target.value } }))} className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-xs text-white outline-none focus:border-yellow-400" placeholder="60" />
                </label>
                <label>
                  <FieldHelp label="Reps logradas" help="repeticiones" />
                  <input type="number" value={log.reps} onChange={(event) => setLogs((prev) => ({ ...prev, [goal.id]: { ...log, reps: event.target.value } }))} className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-xs text-white outline-none focus:border-yellow-400" placeholder="8" />
                </label>
                <label>
                  <FieldHelp label="Series" help="cantidad" />
                  <input type="number" value={log.sets} onChange={(event) => setLogs((prev) => ({ ...prev, [goal.id]: { ...log, sets: event.target.value } }))} className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-xs text-white outline-none focus:border-yellow-400" placeholder="3" />
                </label>
                <label>
                  <FieldHelp label="RIR" help="reps en reserva" />
                  <input type="number" value={log.rir} onChange={(event) => setLogs((prev) => ({ ...prev, [goal.id]: { ...log, rir: event.target.value } }))} className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-xs text-white outline-none focus:border-yellow-400" placeholder="2" />
                </label>
              </div>

              <div className="mt-3 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">¿Para qué sirve este registro?</p>
                <p className="mt-1 text-[11px] text-neutral-500">Ayuda a ver tu evolución, constancia y respuesta a la carga para ajustar mejor el plan.</p>
              </div>

              <div className="mt-3 flex gap-2">
                <button type="button" disabled={saving} onClick={() => onLog(goal, { weight_kg: numberValue(log.weight_kg), reps: Math.round(numberValue(log.reps, goal.target_reps)), sets: Math.round(numberValue(log.sets, 1)), rir: log.rir === '' ? undefined : Math.round(numberValue(log.rir, 2)) })} className="flex-1 rounded-2xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-neutral-950 hover:bg-yellow-300 disabled:opacity-50">Guardar entrenamiento</button>
                <button type="button" onClick={() => onDelete(goal)} className="rounded-2xl border border-red-900/50 bg-red-950/20 p-2.5 text-red-300 hover:text-red-100" aria-label="Pausar meta"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function patchHabitCompletionData(
  current: MyGamificationApi,
  habitId: number,
  dateKey: string,
  completed: boolean,
  currentValue: number
): MyGamificationApi {
  const todayKey = localDateKey();
  const updatedHabits = current.habits.map((habit) => {
    if (habit.id !== habitId) return habit;
    const baseGrid = habit.weekly_grid && habit.weekly_grid.length > 0
      ? habit.weekly_grid
      : current.weekly_summary.days.map((day) => ({ date: day.date, label: day.label, completed: false, current_value: 0, is_today: day.date === todayKey }));
    const weekly_grid = baseGrid.map((cell) => cell.date === dateKey
      ? { ...cell, completed, current_value: completed ? currentValue : 0 }
      : cell);
    return {
      ...habit,
      completed_today: dateKey === todayKey ? completed : habit.completed_today,
      current_value_today: dateKey === todayKey ? (completed ? currentValue : 0) : habit.current_value_today,
      weekly_completed: weekly_grid.filter((cell) => cell.completed).length,
      weekly_grid,
    };
  });

  const activeHabits = updatedHabits.filter((habit) => habit.active === 1);
  const days = current.weekly_summary.days.map((day) => {
    const dayCompleted = activeHabits.reduce((sum, habit) => {
      const grid = habit.weekly_grid || [];
      return sum + (grid.some((cell) => cell.date === day.date && cell.completed) ? 1 : 0);
    }, 0);
    return {
      ...day,
      completed: Math.min(activeHabits.length, dayCompleted),
      total: activeHabits.length,
      percent: activeHabits.length ? clampPercent((dayCompleted / activeHabits.length) * 100) : 0,
    };
  });
  const weeklyTarget = activeHabits.reduce((sum, habit) => sum + periodTargetForHabit(habit, current.weekly_summary.days.length || 7), 0);
  const completedSlots = Math.min(weeklyTarget, days.reduce((sum, day) => sum + day.completed, 0));

  const daily_missions = current.daily_missions.map((mission) => mission.habit_id === habitId && dateKey === todayKey
    ? { ...mission, completed, current_value: completed ? currentValue : 0 }
    : mission);

  return {
    ...current,
    habits: updatedHabits,
    daily_missions,
    weekly_summary: {
      ...current.weekly_summary,
      days,
      total_habit_slots: weeklyTarget,
      completed_habit_slots: completedSlots,
      remaining_habit_slots: Math.max(0, weeklyTarget - completedSlots),
      completion_percent: weeklyTarget ? clampPercent((completedSlots / weeklyTarget) * 100) : 0,
    },
  };
}

interface GamificationPanelProps { currentUser?: ClientProfile; }

export const GamificationPanel: React.FC<GamificationPanelProps> = ({ currentUser: _currentUser }) => {
  const [data, setData] = useState<MyGamificationApi | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [habitValues, setHabitValues] = useState<Record<number, string>>({});
  const [period, setPeriod] = useState<GamificationPeriod>('7d');

  const load = async (selectedPeriod: GamificationPeriod = period) => {
    setLoadError('');
    try {
      const response = await getMyGamificationFromApi(selectedPeriod);
      setData(response);
      const nextValues: Record<number, string> = {};
      response.habits.forEach((habit) => {
        nextValues[habit.id] = String(habit.current_value_today || habit.target_value || 0);
      });
      setHabitValues(nextValues);
    } catch {
      setData(null);
      setLoadError('No pudimos cargar tu Camino Imperial. Intenta nuevamente en unos segundos.');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => { setInitialLoading(true); void load(period); }, [period]);

  const completedToday = data?.daily_missions.filter((mission) => mission.completed).length || 0;
  const totalToday = data?.daily_missions.length || 0;
  const primaryStreak = data?.streaks.find((streak) => streak.streak_type === 'habit_consistency')
    || data?.streaks.find((streak) => streak.streak_type === 'training')
    || data?.streaks[0];

  const todayPercent = totalToday ? clampPercent((completedToday / totalToday) * 100) : 0;

  const periodActivityCounts = useMemo(() => {
    const datesForCategories = (categories: HabitCategory[]) => {
      const dates = new Set<string>();
      (data?.habits || []).forEach((habit) => {
        if (!categories.includes(habit.category)) return;
        (habit.weekly_grid || []).forEach((cell) => {
          if (cell.completed) dates.add(cell.date);
        });
      });
      return dates.size;
    };
    return {
      training: datesForCategories(['training', 'gym']),
      water: datesForCategories(['water']),
      nutrition: datesForCategories(['nutrition']),
      sleep: datesForCategories(['sleep']),
    };
  }, [data?.habits]);

  const runAction = async (action: () => Promise<void>, successMessage?: string) => {
    setSaving(true);
    setMessage('');
    try {
      await action();
      if (successMessage) setMessage(successMessage);
      await load();
    } catch {
      setMessage('No se pudo guardar el cambio. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const dismissNotification = async (id: number) => {
    try { await markGamificationNotificationReadFromApi(id); await load(); } catch { /* no bloquea */ }
  };

  if (initialLoading) {
    return (
      <section className="rounded-[2rem] border border-neutral-800 bg-neutral-950 p-8 text-center shadow-2xl shadow-black/40">
        <RefreshCw className="mx-auto h-7 w-7 animate-spin text-fuchsia-300" />
        <p className="mt-3 text-sm font-bold text-neutral-300">Cargando tu Camino Imperial…</p>
      </section>
    );
  }

  if (!data || !data.status) {
    return (
      <section className="rounded-[2rem] border border-red-900/40 bg-red-950/15 p-8 text-center shadow-2xl shadow-black/40">
        <p className="text-sm font-bold text-red-200">{loadError || 'No se pudo cargar tu progreso.'}</p>
        <button type="button" onClick={() => { setInitialLoading(true); void load(period); }} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-500"><RefreshCw className="h-4 w-4" /> Reintentar</button>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="relative overflow-hidden rounded-[2rem] border border-fuchsia-500/20 bg-neutral-950 p-5 shadow-2xl shadow-black/40 md:p-6">
        <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at 18% 10%, rgba(236,72,153,0.28), transparent 30%), radial-gradient(circle at 80% 5%, rgba(250,204,21,0.18), transparent 28%), radial-gradient(circle at 60% 100%, rgba(34,211,238,0.16), transparent 35%)' }} />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-fuchsia-300"><Sparkles className="h-4 w-4" /> Camino Imperial</p>
            <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">Diseña la semana que no quieres repetir</h2>
            <p className="mt-2 max-w-2xl text-sm text-neutral-400">Tracker premium de hábitos, rachas y fuerza para convertir tus metas en acciones diarias.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MetricCard label="Hoy" value={`${completedToday}/${totalToday}`} helper="misiones" tone="red" />
            <MetricCard label="Racha" value={primaryStreak?.current_count || 0} helper={primaryStreak?.label || 'hábitos'} tone="yellow" />
            <MetricCard label={data.weekly_summary.period_label || periodLabel(data.weekly_summary.period)} value={`${data.weekly_summary.completion_percent}%`} helper="cumplido" tone="sky" />
          </div>
        </div>
        <div className="relative mt-5 h-4 overflow-hidden rounded-full border border-neutral-800 bg-neutral-900">
          <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-red-500 to-yellow-300 shadow-[0_0_28px_rgba(236,72,153,0.45)]" style={{ width: `${todayPercent}%` }} />
        </div>
        <div className="relative mt-5 rounded-2xl border border-neutral-800 bg-black/25 p-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-neutral-500">Filtrar matriz de hábitos y cargas</p>
          <div className="flex flex-wrap gap-2">
            {gamificationPeriodOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setPeriod(option.key)}
                className={cx(
                  'rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-wider transition',
                  period === option.key
                    ? 'border-yellow-300 bg-yellow-400 text-neutral-950'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-yellow-400/60 hover:text-yellow-100'
                )}
              >
                {option.label}
                <span className="ml-1 text-[9px] opacity-70">{option.helper}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {message && <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-4 text-xs font-bold text-amber-100">{message}</div>}
      {data.notifications.slice(0, 1).map((notification) => (
        <button key={notification.id} onClick={() => dismissNotification(notification.id)} className="w-full rounded-2xl border border-amber-900/40 bg-amber-950/20 p-4 text-left hover:bg-amber-950/30">
          <p className="text-xs font-black text-amber-200">{notification.title}</p>
          <p className="mt-1 text-[11px] text-neutral-300">{notification.message}</p>
          <span className="mt-2 block text-[9px] text-neutral-500">Toca para marcar como leído</span>
        </button>
      ))}

      <CollapsibleSection
        title="Resumen de progreso"
        description="Actividad por categoría, nivel, objetivo semanal, gráficas y rachas."
        icon={<BarChart3 className="h-5 w-5" />}
        defaultOpen
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Días entrenados" value={periodActivityCounts.training} helper={data.weekly_summary.period_label || periodLabel(data.weekly_summary.period)} tone="red" />
            <MetricCard label="Días con agua" value={periodActivityCounts.water} helper="meta de hidratación" tone="sky" />
            <MetricCard label="Días de nutrición" value={periodActivityCounts.nutrition} helper="cumplimiento registrado" tone="emerald" />
            <MetricCard label="Días de sueño" value={periodActivityCounts.sleep} helper="descanso registrado" tone="yellow" />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
            <div className="xl:col-span-1"><LevelProgress data={data} /></div>
            <div className="xl:col-span-1"><RadialProgress percent={data.weekly_summary.completion_percent} label="Objetivo" detail={`${data.weekly_summary.completed_habit_slots}/${data.weekly_summary.total_habit_slots} terminados`} /></div>
            <div className="xl:col-span-2"><WeeklyBars data={data} /></div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <CategoryProgress habits={data.habits} />
            <TopHabits habits={data.habits} />
            <div className="rounded-[2rem] border border-neutral-800 bg-neutral-950/90 p-5 shadow-2xl shadow-black/30">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10"><Flame className="h-7 w-7 text-orange-300" /></div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Racha principal</p>
                  <p className="text-3xl font-black text-white">{primaryStreak?.current_count || 0} días</p>
                  <p className="text-[10px] text-neutral-500">Mejor registro: {primaryStreak?.best_count || 0}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {data.streaks.slice(0, 4).map((streak) => (
                  <div key={streak.streak_type} className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
                    <p className="text-lg font-black text-white">{streak.current_count}</p>
                    <p className="text-[9px] uppercase tracking-wider text-neutral-500">{streak.label}</p>
                  </div>
                ))}
                {data.streaks.length === 0 && <p className="col-span-2 text-xs text-neutral-500">Sin rachas todavía.</p>}
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Hábitos y matriz semanal"
        description="Abre para registrar, crear o editar hábitos y revisar cada día del periodo."
        icon={<Target className="h-5 w-5" />}
        defaultOpen
        contentClassName="p-0 md:p-0"
      >
        <HabitsSection
        data={data}
        values={habitValues}
        setValues={setHabitValues}
        saving={saving}
        onCreate={(payload) => runAction(() => createHabitInApi(payload).then(() => undefined), 'Hábito creado.')}
        onUpdate={(habit, payload) => runAction(() => updateHabitInApi(habit.id, payload).then(() => undefined), 'Hábito actualizado.')}
        onDelete={(habit) => runAction(() => deleteHabitInApi(habit.id), 'Hábito desactivado.')}
        onToggle={async (habit, completed, date, currentValue) => {
          const dateKey = date || localDateKey();
          const completedValue = completed ?? !habit.completed_today;
          const valueToSave = habit.target_type === 'boolean'
            ? habit.target_value
            : numberValue(currentValue ?? habitValues[habit.id] ?? String(habit.target_value), habit.target_value);
          const previousData = data;
          setMessage(completedValue ? 'Hábito marcado.' : 'Hábito desmarcado.');
          setData((current) => current ? patchHabitCompletionData(current, habit.id, dateKey, completedValue, valueToSave) : current);
          setSaving(true);
          try {
            await toggleHabitCompletionInApi(habit.id, {
              date: dateKey,
              completed: completedValue,
              current_value: valueToSave,
            });
            void load();
          } catch {
            setData(previousData);
            setMessage('No se pudo guardar el cambio. Intenta nuevamente.');
          } finally {
            setSaving(false);
          }
        }}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Entrenador de fuerza"
        description="Metas, cargas, repeticiones y recomendaciones del entrenador."
        icon={<Dumbbell className="h-5 w-5" />}
        contentClassName="p-0 md:p-0"
      >
        <StrengthSection
        goals={data.strength_goals}
        saving={saving}
        onCreate={(payload) => runAction(() => createStrengthGoalInApi(payload).then(() => undefined), 'Meta de fuerza creada.')}
        onDelete={(goal) => runAction(() => deleteStrengthGoalInApi(goal.id), 'Meta de fuerza pausada.')}
        onLog={(goal, payload) => runAction(() => logStrengthGoalInApi(goal.id, payload).then(() => undefined), 'Entrenamiento guardado. Revisa la recomendación del entrenador.')}
        />
      </CollapsibleSection>

      <details className="group rounded-[2rem] border border-neutral-800 bg-neutral-950/90 p-5 shadow-2xl shadow-black/30">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold text-white">
          <span>Insignias y logros recientes</span>
          <ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-neutral-500">Insignias</p>
            {data.badges.length === 0 ? <p className="text-xs text-neutral-500">Aún no hay insignias.</p> : data.badges.slice(0, 6).map((badge) => <div key={badge.badge_key} className="mb-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-3"><p className="text-xs font-bold text-white"><Trophy className="mr-1 inline h-3.5 w-3.5 text-yellow-400" />{badge.title}</p><p className="mt-1 text-[10px] text-neutral-500">{badge.description}</p></div>)}
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-neutral-500">Actividad reciente</p>
            {!data.recent_events?.length ? <p className="text-xs text-neutral-500">Aún no hay actividad reciente.</p> : data.recent_events.slice(0, 6).map((event) => <div key={event.event_key} className="mb-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-3"><p className="text-xs font-bold text-white"><Zap className="mr-1 inline h-3.5 w-3.5 text-red-400" />+{event.points} XP · +{event.coins} monedas</p><p className="mt-1 text-[10px] text-neutral-500">{event.reason}</p></div>)}
          </div>
        </div>
      </details>
    </section>
  );
};
