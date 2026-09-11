import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, Calendar, Check, ChevronDown, ClipboardCheck, Edit3, Eye, Lock, Plus, RefreshCw, ShieldCheck, Sparkles, Trophy, Users, X } from 'lucide-react';
import { ClientProfile } from '../data/mockData';
import {
  ApiChallenge,
  ChallengePayload,
  ChallengeParticipantProgressRow,
  createChallengeInApi,
  createDefaultChallengeInApi,
  ensurePremiumChallengeInApi,
  joinChallengeInApi,
  listChallengeParticipantsFromApi,
  listChallengesFromApi,
  reviewChallengeParticipantPaymentInApi,
  updateChallengeInApi,
  updateChallengeParticipantMeasurementsInApi,
} from '../services/challengeService';

interface ChallengesViewProps {
  currentUser: ClientProfile;
  onUpdateTokens: (newAmount: number) => void;
}

type ChallengeFormState = {
  title: string;
  description: string;
  status: string;
  starts_at: string;
  ends_at: string;
  price_cop: number;
  compare_at_cop: number;
  launch_badge: string;
  slots_total: number;
  duration_weeks: number;
  guarantee_enabled: boolean;
  min_completion_percent: number;
  min_improvement_indicators: number;
  training_days_per_week: number;
  target_focus: string;
  refund_terms: string;
};

const DEFAULT_TERMS = 'La garantía aplica si el participante cumple mínimo el 80% del reto, registra inicio y cierre, y no mejora en al menos 2 indicadores medibles. No aplica si abandona, no registra evidencia o presenta datos inconsistentes.';

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

function dateLabel(value?: string | null) {
  if (!value) return 'Sin fecha';
  try {
    return new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return 'Sin fecha';
  }
}

function toInputDate(value?: string | null) {
  if (!value) return '';
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function dateToApi(value: string, endOfDay = false) {
  if (!value) return null;
  return `${value}T${endOfDay ? '23:59:00' : '00:00:00'}`;
}

function defaultEndDate(startDate: string, weeks: number) {
  if (!startDate) return '';
  const start = new Date(`${startDate}T00:00:00`);
  start.setDate(start.getDate() + Math.max(1, weeks) * 7 - 1);
  return start.toISOString().slice(0, 10);
}

function emptyForm(): ChallengeFormState {
  const start = new Date().toISOString().slice(0, 10);
  return {
    title: 'Reto Camino Imperial 8 Semanas',
    description: 'Experiencia premium de transformación con entrenamiento, nutrición, hábitos, progresión de cargas, medición inicial/final, revisión semanal y garantía condicionada por cumplimiento.',
    status: 'active',
    starts_at: start,
    ends_at: defaultEndDate(start, 8),
    price_cop: 80000,
    compare_at_cop: 120000,
    launch_badge: 'Precio de lanzamiento',
    slots_total: 50,
    duration_weeks: 8,
    guarantee_enabled: true,
    min_completion_percent: 80,
    min_improvement_indicators: 2,
    training_days_per_week: 3,
    target_focus: 'recomposition',
    refund_terms: DEFAULT_TERMS,
  };
}

function formFromChallenge(challenge: ApiChallenge): ChallengeFormState {
  return {
    title: challenge.title,
    description: challenge.description || '',
    status: challenge.status || 'active',
    starts_at: toInputDate(challenge.starts_at),
    ends_at: toInputDate(challenge.ends_at),
    price_cop: challenge.price_cop || 0,
    compare_at_cop: challenge.compare_at_cop || 0,
    launch_badge: challenge.launch_badge || 'Precio de lanzamiento',
    slots_total: challenge.slots_total || 0,
    duration_weeks: challenge.duration_weeks || 8,
    guarantee_enabled: Boolean(challenge.guarantee_enabled),
    min_completion_percent: challenge.min_completion_percent || 80,
    min_improvement_indicators: challenge.min_improvement_indicators || 2,
    training_days_per_week: challenge.training_days_per_week || 3,
    target_focus: challenge.target_focus || 'recomposition',
    refund_terms: challenge.refund_terms || DEFAULT_TERMS,
  };
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div>
      <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
        <span>{label}</span>
        <span className="font-bold text-white">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800">
        <div className="h-full bg-gradient-to-r from-red-700 via-red-500 to-amber-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function guaranteeLabel(status?: string) {
  const map: Record<string, string> = {
    en_proceso: 'En proceso',
    sin_garantia: 'Sin garantía activa',
    no_aplica_por_cumplimiento: 'No aplica por bajo cumplimiento',
    revisar_devolucion: 'Revisar garantía',
    resultado_logrado: 'Resultado logrado',
  };
  return map[status || ''] || 'En proceso';
}

export const ChallengesView: React.FC<ChallengesViewProps> = ({ currentUser, onUpdateTokens }) => {
  const [challenges, setChallenges] = useState<ApiChallenge[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ChallengeFormState>(() => emptyForm());
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const [participants, setParticipants] = useState<ChallengeParticipantProgressRow[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [expandedTerms, setExpandedTerms] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [participantFilter, setParticipantFilter] = useState('all');
  const ensuredPremiumRef = useRef(false);

  const isStaff = ['admin', 'trainer'].includes(currentUser.role);
  const selectedChallenge = useMemo(() => challenges.find(ch => ch.id === selectedChallengeId) || null, [challenges, selectedChallengeId]);
  const participantStats = useMemo(() => {
    const approved = participants.filter(row => ['approved', 'not_required'].includes(row.participant.payment_status)).length;
    const pending = participants.filter(row => row.participant.payment_status === 'pending').length;
    const risk = participants.filter(row => (row.progress.completion_percent || 0) < 60 || (row.progress.integrity_flags || []).some(flag => !flag.includes('Sin alertas'))).length;
    const reviewRefund = participants.filter(row => row.progress.guarantee_status === 'revisar_devolucion').length;
    return { approved, pending, risk, reviewRefund };
  }, [participants]);

  const loadChallenges = () => {
    setLoading(true);
    listChallengesFromApi()
      .then(async (items) => {
        if (isStaff && items.length === 0 && !ensuredPremiumRef.current) {
          ensuredPremiumRef.current = true;
          const created = await ensurePremiumChallengeInApi();
          setMsg('Reto premium creado automáticamente. Puedes editar precio, fechas, cupos y objetivo.');
          setChallenges([created]);
          return;
        }
        setChallenges(items);
      })
      .catch(() => setMsg('No se pudieron cargar los retos. Intenta nuevamente.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  const payloadFromForm = (): ChallengePayload => ({
    title: form.title,
    description: form.description,
    status: form.status,
    starts_at: dateToApi(form.starts_at),
    ends_at: dateToApi(form.ends_at, true),
    challenge_type: 'transformation_8w',
    price_cop: Number(form.price_cop || 0),
    compare_at_cop: form.compare_at_cop > 0 ? Number(form.compare_at_cop) : null,
    currency: 'COP',
    launch_badge: form.launch_badge,
    slots_total: Number(form.slots_total || 0),
    duration_weeks: Number(form.duration_weeks || 8),
    guarantee_enabled: form.guarantee_enabled,
    min_completion_percent: Number(form.min_completion_percent || 80),
    min_improvement_indicators: Number(form.min_improvement_indicators || 2),
    training_days_per_week: Number(form.training_days_per_week || 3),
    refund_terms: form.refund_terms,
    target_focus: form.target_focus,
  });

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowCreate(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    const operation = editingId ? updateChallengeInApi(editingId, payloadFromForm()) : createChallengeInApi(payloadFromForm());
    operation
      .then((saved) => {
        setChallenges(prev => editingId ? prev.map(ch => ch.id === saved.id ? saved : ch) : [saved, ...prev]);
        setMsg(editingId ? 'Reto actualizado correctamente.' : 'Reto creado y publicado correctamente.');
        resetForm();
      })
      .catch((error) => setMsg(error?.message || 'No se pudo guardar el reto. Revisa los datos e intenta nuevamente.'))
      .finally(() => setLoading(false));
  };

  const handleQuickCreate = () => {
    setMsg('');
    setLoading(true);
    createDefaultChallengeInApi()
      .then((saved) => {
        setChallenges(prev => [saved, ...prev]);
        setMsg('Reto Camino Imperial creado con configuración recomendada. Ya puedes editar precio, cupos o fechas.');
      })
      .catch((error) => setMsg(error?.message || 'No se pudo crear el reto.'))
      .finally(() => setLoading(false));
  };

  const handleEdit = (challenge: ApiChallenge) => {
    setForm(formFromChallenge(challenge));
    setEditingId(challenge.id);
    setShowCreate(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJoin = (challengeId: number) => {
    setMsg('');
    joinChallengeInApi(challengeId)
      .then((participant) => {
        setChallenges(prev => prev.map(ch => ch.id === challengeId ? {
          ...ch,
          participants_count: ch.my_participation ? ch.participants_count : ch.participants_count + 1,
          slots_remaining: typeof ch.slots_remaining === 'number' ? Math.max(0, ch.slots_remaining - (ch.my_participation ? 0 : 1)) : ch.slots_remaining,
          my_participation: participant,
        } : ch));
        onUpdateTokens((currentUser.tokens || 0) + 50);
        setMsg(participant.payment_status === 'pending' ? 'Cupo reservado. Realiza el pago para activar el tablero premium del reto.' : 'Inscripción registrada correctamente.');
      })
      .catch((error) => setMsg(error?.message || 'No se pudo inscribir al reto. Verifica disponibilidad o intenta nuevamente.'));
  };

  const loadParticipants = (challengeId: number, weekOverride = selectedWeek, filterOverride = participantFilter) => {
    setSelectedChallengeId(challengeId);
    setLoadingParticipants(true);
    const filters: { week?: number | null; payment_status?: string; status?: string } = { week: weekOverride };
    if (filterOverride === 'approved') filters.payment_status = 'approved';
    if (filterOverride === 'pending') filters.payment_status = 'pending';
    if (filterOverride === 'active') filters.status = 'active';
    listChallengeParticipantsFromApi(challengeId, filters)
      .then(setParticipants)
      .catch(() => setMsg('No se pudieron cargar los participantes.'))
      .finally(() => setLoadingParticipants(false));
  };

  const approvePayment = (row: ChallengeParticipantProgressRow) => {
    if (!selectedChallenge) return;
    reviewChallengeParticipantPaymentInApi(selectedChallenge.id, row.participant.id, {
      payment_status: 'approved',
      paid_amount_cop: selectedChallenge.price_cop || row.participant.paid_amount_cop || 0,
      admin_notes: 'Pago del reto validado por administración.',
    })
      .then(() => loadParticipants(selectedChallenge.id))
      .then(loadChallenges)
      .catch(() => setMsg('No se pudo validar el pago. Intenta nuevamente.'));
  };

  const saveMeasurements = (row: ChallengeParticipantProgressRow) => {
    if (!selectedChallenge) return;
    const baselineWeight = Number(window.prompt('Peso inicial en kg', String(row.participant.baseline_weight || '')) || 0) || null;
    const baselineWaist = Number(window.prompt('Cintura inicial en cm', String(row.participant.baseline_waist || '')) || 0) || null;
    const baselineFat = Number(window.prompt('Grasa corporal inicial %', String(row.participant.baseline_body_fat || '')) || 0) || null;
    const baselineMuscle = Number(window.prompt('Masa muscular inicial en kg', String(row.participant.baseline_muscle_mass || '')) || 0) || null;
    const finalWeight = Number(window.prompt('Peso final en kg', String(row.participant.final_weight || '')) || 0) || null;
    const finalWaist = Number(window.prompt('Cintura final en cm', String(row.participant.final_waist || '')) || 0) || null;
    const finalFat = Number(window.prompt('Grasa corporal final %', String(row.participant.final_body_fat || '')) || 0) || null;
    const finalMuscle = Number(window.prompt('Masa muscular final en kg', String(row.participant.final_muscle_mass || '')) || 0) || null;
    updateChallengeParticipantMeasurementsInApi(selectedChallenge.id, row.participant.id, {
      baseline_weight: baselineWeight,
      baseline_waist: baselineWaist,
      baseline_body_fat: baselineFat,
      baseline_muscle_mass: baselineMuscle,
      final_weight: finalWeight,
      final_waist: finalWaist,
      final_body_fat: finalFat,
      final_muscle_mass: finalMuscle,
    })
      .then(() => loadParticipants(selectedChallenge.id))
      .catch(() => setMsg('No se pudieron guardar las mediciones.'));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-red-500 font-black">Camino Imperial Premium</p>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2"><Trophy className="w-6 h-6 text-amber-500" /> Retos de transformación</h2>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">Experiencia diferencial para participantes del reto: tablero premium, revisión semanal, métricas verificables, control de pagos y señales de consistencia.</p>
        </div>
        {isStaff && <div className="flex flex-wrap gap-2"><button onClick={handleQuickCreate} disabled={loading} className="bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Crear recomendado</button><button onClick={() => { setShowCreate(!showCreate); if (!showCreate) setForm(emptyForm()); }} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5">{showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {showCreate ? 'Cerrar formulario' : 'Crear personalizado'}</button></div>}
      </div>

      {msg && <div className="p-3 bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-lg">{msg}</div>}

      {isStaff && <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4"><p className="flex items-center gap-2 text-xs font-black text-white"><Lock className="w-4 h-4 text-amber-400" /> Acceso diferencial</p><p className="text-[11px] text-neutral-400 mt-2">Solo participantes con pago validado ven el tablero premium completo del reto.</p></div><div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4"><p className="flex items-center gap-2 text-xs font-black text-white"><Eye className="w-4 h-4 text-emerald-400" /> Revisión semanal</p><p className="text-[11px] text-neutral-400 mt-2">Admin revisa activos, pagos, cumplimiento, registros, cargas, hábitos y alertas por semana.</p></div><div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4"><p className="flex items-center gap-2 text-xs font-black text-white"><ShieldCheck className="w-4 h-4 text-red-400" /> Control de trampa</p><p className="text-[11px] text-neutral-400 mt-2">La app marca falta de medición, pago pendiente, registros concentrados y avances sin evidencia.</p></div></div>}

      {showCreate && isStaff && (
        <form onSubmit={handleSave} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-white font-black text-lg">{editingId ? 'Editar reto' : 'Nuevo Reto Camino Imperial'}</h3><p className="text-xs text-neutral-500">Configura precio, cupos, fechas, garantía y reglas de cumplimiento.</p></div><button type="button" onClick={resetForm} className="text-xs text-neutral-400 hover:text-white">Cancelar</button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Nombre del reto" required className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white"><option value="active">Activo</option><option value="draft">Borrador</option><option value="closed">Cerrado</option><option value="cancelled">Cancelado</option></select></div>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descripción comercial del reto" rows={3} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white resize-none" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><label className="text-[11px] text-neutral-400">Inicio<input type="date" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value, ends_at: defaultEndDate(e.target.value, form.duration_weeks) })} className="mt-1 w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></label><label className="text-[11px] text-neutral-400">Final<input type="date" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} className="mt-1 w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></label><label className="text-[11px] text-neutral-400">Semanas<input type="number" min={1} max={52} value={form.duration_weeks} onChange={e => setForm({ ...form, duration_weeks: Number(e.target.value), ends_at: defaultEndDate(form.starts_at, Number(e.target.value)) })} className="mt-1 w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></label><label className="text-[11px] text-neutral-400">Días entreno/semana<input type="number" min={1} max={7} value={form.training_days_per_week} onChange={e => setForm({ ...form, training_days_per_week: Number(e.target.value) })} className="mt-1 w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></label></div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3"><label className="text-[11px] text-neutral-400">Precio actual<input type="number" value={form.price_cop} onChange={e => setForm({ ...form, price_cop: Number(e.target.value) })} className="mt-1 w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></label><label className="text-[11px] text-neutral-400">Precio tachado<input type="number" value={form.compare_at_cop} onChange={e => setForm({ ...form, compare_at_cop: Number(e.target.value) })} className="mt-1 w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></label><label className="text-[11px] text-neutral-400">Cupos<input type="number" value={form.slots_total} onChange={e => setForm({ ...form, slots_total: Number(e.target.value) })} className="mt-1 w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></label><label className="text-[11px] text-neutral-400">Cumplimiento mínimo<input type="number" min={0} max={100} value={form.min_completion_percent} onChange={e => setForm({ ...form, min_completion_percent: Number(e.target.value) })} className="mt-1 w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></label><label className="text-[11px] text-neutral-400">Indicadores mínimos<input type="number" min={0} max={10} value={form.min_improvement_indicators} onChange={e => setForm({ ...form, min_improvement_indicators: Number(e.target.value) })} className="mt-1 w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></label></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><input value={form.launch_badge} onChange={e => setForm({ ...form, launch_badge: e.target.value })} placeholder="Etiqueta de urgencia" className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /><select value={form.target_focus} onChange={e => setForm({ ...form, target_focus: e.target.value })} className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white"><option value="recomposition">Recomposición corporal</option><option value="weight_loss">Reducción de peso</option><option value="fat_loss">Reducción de grasa</option><option value="muscle_gain">Aumento de masa muscular</option></select><label className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-300"><input type="checkbox" checked={form.guarantee_enabled} onChange={e => setForm({ ...form, guarantee_enabled: e.target.checked })} /> Garantía condicionada activa</label></div>
          <textarea value={form.refund_terms} onChange={e => setForm({ ...form, refund_terms: e.target.value })} rows={3} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white resize-none" />
          <button disabled={loading} type="submit" className="bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold text-xs py-2.5 px-5 rounded-lg flex items-center gap-2">{loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {editingId ? 'Guardar cambios' : 'Crear y publicar reto'}</button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {challenges.map(chal => {
          const hasJoined = Boolean(chal.my_participation);
          const isPendingPayment = chal.my_participation?.payment_status === 'pending';
          const progress = isPendingPayment ? null : chal.my_progress;
          const savings = (chal.compare_at_cop || 0) - (chal.price_cop || 0);
          return (
            <div key={chal.id} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
              <div><div className="flex justify-between items-start gap-3 mb-4"><div className="p-2 rounded-xl border border-red-900 bg-red-950/30 text-red-500"><Trophy className="w-5 h-5" /></div><div className="text-right space-y-1"><span className="text-[10px] text-white bg-red-700 px-2 py-1 rounded-full uppercase font-black">{chal.launch_badge || chal.status}</span>{chal.slots_remaining !== null && chal.slots_remaining !== undefined && <p className="text-[10px] text-amber-400 font-bold">{chal.slots_remaining} cupos disponibles</p>}</div></div>
                <h3 className="text-base font-black text-white mb-1 leading-snug">{chal.title}</h3><p className="text-xs text-neutral-400 leading-relaxed min-h-[54px]">{chal.description || 'Reto de transformación con seguimiento Imperial.'}</p>
                <div className="my-4 p-3 rounded-xl bg-gradient-to-br from-red-950/40 to-neutral-900 border border-red-900/30"><div className="flex items-end gap-2">{chal.compare_at_cop ? <span className="text-sm text-neutral-500 line-through font-bold">{formatCurrency(chal.compare_at_cop)}</span> : null}<span className="text-2xl font-black text-white">{formatCurrency(chal.price_cop)}</span></div>{savings > 0 && <p className="text-[11px] text-emerald-400 font-bold mt-1">Ahorro de {formatCurrency(savings)}</p>}</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-400 my-4"><span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {chal.participants_count} inscritos</span><span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {chal.duration_weeks || 8} semanas</span><span>Inicio: <b className="text-neutral-200">{dateLabel(chal.starts_at)}</b></span><span>Final: <b className="text-neutral-200">{dateLabel(chal.ends_at)}</b></span></div>
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 mb-4"><p className="flex items-center gap-1.5 text-xs font-bold text-amber-300"><Lock className="w-4 h-4" /> {chal.goal_label || 'Transformación racional'}</p><p className="text-[11px] text-neutral-400 mt-1">{chal.goal_description || 'Tablero premium, revisión semanal, métricas verificables y control de cumplimiento solo para inscritos.'}</p></div>
                {chal.guarantee_enabled && <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 mb-4"><p className="flex items-center gap-1.5 text-xs font-bold text-emerald-300"><ShieldCheck className="w-4 h-4" /> Garantía condicionada</p><p className="text-[11px] text-neutral-400 mt-1">Cumple mínimo {chal.min_completion_percent}% y mejora en {chal.min_improvement_indicators} indicadores.</p><button onClick={() => setExpandedTerms(expandedTerms === chal.id ? null : chal.id)} className="text-[10px] text-emerald-400 mt-2 flex items-center gap-1">Ver condiciones <ChevronDown className="w-3 h-3" /></button>{expandedTerms === chal.id && <p className="text-[11px] text-neutral-300 mt-2 leading-relaxed">{chal.refund_terms}</p>}</div>}
                {hasJoined && isPendingPayment && <div className="space-y-2 bg-amber-950/20 border border-amber-900/40 rounded-xl p-3 mb-4"><p className="text-xs font-black text-amber-300 flex items-center gap-1.5"><Lock className="w-4 h-4" /> Cupo reservado</p><p className="text-[11px] text-neutral-400">Cuando administración valide el pago, se activa tu tablero premium con progreso, métricas y estado de garantía.</p></div>}
                {progress && <div className="space-y-3 bg-neutral-900/50 border border-neutral-800 rounded-xl p-3 mb-4"><div className="flex items-center justify-between"><p className="text-xs font-black text-white">Tu tablero premium: semana {progress.current_week}/{progress.duration_weeks}</p><span className="text-[10px] rounded-full bg-neutral-800 px-2 py-1 text-neutral-300">{guaranteeLabel(progress.guarantee_status)}</span></div><ProgressBar label="Cumplimiento total" value={progress.completion_percent} /><div className="grid grid-cols-2 gap-2"><ProgressBar label="Hábitos" value={progress.habit_percent} /><ProgressBar label="Entreno" value={progress.training_percent} /><ProgressBar label="Nutrición" value={progress.nutrition_percent} /><ProgressBar label="Cargas" value={progress.strength_percent} /></div><div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-400"><span>Días activos: <b className="text-white">{progress.active_days || 0}</b></span><span>Mejoras: <b className="text-white">{progress.improvement_indicators}</b></span><span>Fotos: <b className="text-white">{progress.evidence_summary?.progress_photos || 0}</b></span><span>Mediciones: <b className="text-white">{progress.evidence_summary?.body_metrics || 0}</b></span></div><div className="rounded-lg bg-neutral-950 border border-neutral-800 p-2"><p className="text-[10px] font-bold text-neutral-300 mb-1">Estado de consistencia</p>{(progress.integrity_flags || []).slice(0, 2).map((flag, index) => <p key={index} className="text-[10px] text-neutral-500">• {flag}</p>)}</div></div>}
              </div>
              <div className="space-y-2">{isStaff && <div className="grid grid-cols-2 gap-2"><button onClick={() => handleEdit(chal)} className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs py-2 rounded-lg border border-neutral-700 flex items-center justify-center gap-1.5"><Edit3 className="w-3.5 h-3.5" /> Editar</button><button onClick={() => loadParticipants(chal.id)} className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs py-2 rounded-lg border border-neutral-700 flex items-center justify-center gap-1.5"><ClipboardCheck className="w-3.5 h-3.5" /> Revisar</button></div>}{!isStaff && !hasJoined && <button onClick={() => handleJoin(chal.id)} className="w-full bg-red-600 hover:bg-red-500 text-white font-black text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-red-950/40"><Sparkles className="w-4 h-4" /> Reservar mi cupo</button>}{!isStaff && hasJoined && <div className={`w-full text-center text-xs font-bold py-3 rounded-xl border ${isPendingPayment ? 'bg-amber-950/30 border-amber-900 text-amber-300' : 'bg-emerald-950/30 border-emerald-900 text-emerald-300'}`}>{isPendingPayment ? 'Pago pendiente de validación' : 'Reto premium activo'}</div>}</div>
            </div>
          );
        })}
        {challenges.length === 0 && !loading && <div className="col-span-full bg-neutral-950 border border-neutral-800 rounded-xl p-12 text-center"><Trophy className="w-12 h-12 text-neutral-700 mx-auto mb-3" /><p className="text-sm font-bold text-neutral-300">Aún no hay retos publicados.</p><p className="text-xs text-neutral-500 mt-1">Presiona “Crear recomendado” para activar el reto premium de 8 semanas.</p></div>}
      </div>

      {isStaff && selectedChallenge && <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4"><div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><h3 className="text-white font-black text-lg">Control semanal: {selectedChallenge.title}</h3><p className="text-xs text-neutral-500">Validación de pagos, avance, registros y alertas para evitar trampas.</p></div><button onClick={() => setSelectedChallengeId(null)} className="text-xs text-neutral-400 hover:text-white">Cerrar</button></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3"><p className="text-[10px] text-emerald-300 uppercase font-bold">Activos</p><p className="text-xl font-black text-white">{participantStats.approved}</p></div><div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-3"><p className="text-[10px] text-amber-300 uppercase font-bold">Pendientes</p><p className="text-xl font-black text-white">{participantStats.pending}</p></div><div className="rounded-xl border border-red-900/50 bg-red-950/20 p-3"><p className="text-[10px] text-red-300 uppercase font-bold">Revisar</p><p className="text-xl font-black text-white">{participantStats.risk}</p></div><div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3"><p className="text-[10px] text-neutral-400 uppercase font-bold">Garantía</p><p className="text-xl font-black text-white">{participantStats.reviewRefund}</p></div></div>
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between bg-neutral-900/60 border border-neutral-800 rounded-xl p-3"><div className="flex flex-wrap gap-2 items-center"><span className="text-[11px] text-neutral-400 font-bold">Semana:</span><select value={selectedWeek || ''} onChange={e => { const week = e.target.value ? Number(e.target.value) : null; setSelectedWeek(week); loadParticipants(selectedChallenge.id, week, participantFilter); }} className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white"><option value="">Todas</option>{Array.from({ length: selectedChallenge.duration_weeks || 8 }, (_, index) => index + 1).map(week => <option key={week} value={week}>Semana {week}</option>)}</select><span className="text-[11px] text-neutral-400 font-bold">Filtro:</span><select value={participantFilter} onChange={e => { setParticipantFilter(e.target.value); loadParticipants(selectedChallenge.id, selectedWeek, e.target.value); }} className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white"><option value="all">Todos</option><option value="approved">Pago validado</option><option value="pending">Pago pendiente</option><option value="active">Activos</option></select></div><button onClick={() => loadParticipants(selectedChallenge.id)} className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Actualizar revisión</button></div>
        {loadingParticipants ? <p className="text-xs text-neutral-400">Cargando participantes...</p> : <div className="overflow-x-auto"><table className="min-w-full text-xs"><thead className="text-neutral-500 border-b border-neutral-800"><tr><th className="text-left py-2 pr-3">Cliente</th><th className="text-left py-2 pr-3">Pago</th><th className="text-left py-2 pr-3">Semana</th><th className="text-left py-2 pr-3">Cumplimiento</th><th className="text-left py-2 pr-3">Registros</th><th className="text-left py-2 pr-3">Alertas</th><th className="text-left py-2 pr-3">Garantía</th><th className="text-left py-2 pr-3">Acciones</th></tr></thead><tbody>{participants.map(row => { const weekData = row.progress.selected_week; const flags = row.progress.integrity_flags || []; const hasAlert = flags.some(flag => !flag.includes('Sin alertas')); return <tr key={row.participant.id} className="border-b border-neutral-900 text-neutral-300 align-top"><td className="py-3 pr-3"><b className="text-white block">{row.participant.name}</b><span className="text-neutral-500">{row.participant.email}</span></td><td className="py-3 pr-3"><span className={`px-2 py-1 rounded-full text-[10px] ${row.participant.payment_status === 'approved' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'}`}>{row.participant.payment_status === 'approved' ? 'Validado' : 'Pendiente'}</span></td><td className="py-3 pr-3"><b className="text-white">{weekData ? `Semana ${weekData.week}` : `Sem. ${row.progress.current_week}/${row.progress.duration_weeks}`}</b><span className="block text-neutral-500">{weekData ? `${dateLabel(weekData.start_date)} - ${dateLabel(weekData.end_date)}` : 'Reto completo'}</span></td><td className="py-3 pr-3 min-w-[160px]"><ProgressBar label="Total" value={weekData?.completion_percent ?? row.progress.completion_percent} /></td><td className="py-3 pr-3"><div className="space-y-1 text-neutral-400"><span className="block"><Activity className="inline w-3 h-3 mr-1" /> Entrenos: <b className="text-white">{weekData?.training_done ?? row.progress.training_done}</b></span><span className="block">Hábitos: <b className="text-white">{weekData?.completed_habits ?? row.progress.completed_habits}</b></span><span className="block">Nutrición: <b className="text-white">{weekData?.nutrition_done ?? row.progress.nutrition_done}</b></span><span className="block">Cargas: <b className="text-white">{weekData?.strength_logs_count ?? row.progress.strength_logs_count}</b></span><span className="block">Días activos: <b className="text-white">{weekData?.active_days ?? row.progress.active_days ?? 0}</b></span></div></td><td className="py-3 pr-3 min-w-[210px]"><div className={`rounded-lg p-2 border ${hasAlert ? 'bg-red-950/20 border-red-900/50' : 'bg-emerald-950/10 border-emerald-900/40'}`}><p className={`font-bold flex items-center gap-1 mb-1 ${hasAlert ? 'text-red-300' : 'text-emerald-300'}`}>{hasAlert ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />} {hasAlert ? 'Revisar' : 'Consistente'}</p>{flags.slice(0, 3).map((flag, index) => <p key={index} className="text-[10px] text-neutral-400">• {flag}</p>)}</div></td><td className="py-3 pr-3">{guaranteeLabel(row.progress.guarantee_status)}<span className="block text-neutral-500">{row.progress.improvement_indicators} mejoras</span></td><td className="py-3 pr-3"><div className="flex flex-col gap-2 min-w-[130px]">{row.participant.payment_status !== 'approved' && <button onClick={() => approvePayment(row)} className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold">Validar pago</button>}<button onClick={() => saveMeasurements(row)} className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold">Mediciones</button></div></td></tr>; })}{participants.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-neutral-500">Este reto aún no tiene inscritos con el filtro seleccionado.</td></tr>}</tbody></table></div>}
      </div>}
    </div>
  );
};
