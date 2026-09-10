import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCopy, Download, ExternalLink, FileText, Link2, Loader2, MessageCircle, RefreshCw, ShieldAlert, Trash2, X } from 'lucide-react';
import type { ClientProfile } from '../data/mockData';
import {
  createPortalLink,
  downloadProfessionalPdf,
  getAttention,
  getClientIntake,
  getPortalLinks,
  getPublications,
  publishProfessionalPlan,
  revokePortalLink,
  setClientExperienceMode,
  validateProfessionalPlan,
  type AttentionItem,
  type PortalLinkRow,
  type PublicationRow,
} from '../services/liteService';

type PlanKind = 'routine' | 'diet';
type Review = { kind: PlanKind; warnings: string[]; title: string };

export function CoachOperationsPanel({ users }: { users: ClientProfile[] }) {
  const clients = useMemo(() => users.filter(user => user.role === 'client'), [users]);
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [attention, setAttention] = useState<AttentionItem[]>([]);
  const [links, setLinks] = useState<PortalLinkRow[]>([]);
  const [publications, setPublications] = useState<PublicationRow[]>([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lastUrl, setLastUrl] = useState('');
  const [setLiteMode, setSetLiteMode] = useState(true);
  const [review, setReview] = useState<Review | null>(null);
  const [intakeSummary, setIntakeSummary] = useState<string[]>([]);
  const selected = clients.find(client => client.id === clientId);

  const refresh = async () => {
    setError('');
    try {
      const [attentionRows, linkRows, publicationRows] = await Promise.all([getAttention(), getPortalLinks(), getPublications()]);
      setAttention(attentionRows);
      setLinks(linkRows);
      setPublications(publicationRows);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo actualizar el centro de operaciones.');
    }
  };

  useEffect(() => { void refresh(); }, []);
  useEffect(() => { if (!clientId && clients[0]) setClientId(clients[0].id); }, [clients, clientId]);
  useEffect(() => {
    if (!selected) { setIntakeSummary([]); return; }
    void getClientIntake(Number(selected.id)).then(result => {
      if (!result.completed) { setIntakeSummary(['Cuestionario inicial pendiente.']); return; }
      const data = result.data;
      const flags = [
        data.medical_clearance_needed && 'Requiere autorización médica',
        data.chest_pain_or_fainting && 'Dolor torácico/desmayo reportado',
        data.pregnancy_or_lactation && 'Embarazo/lactancia',
        data.diabetes && 'Diabetes',
        data.kidney_disease && 'Enfermedad renal',
        data.hypertension && 'Hipertensión',
        data.eating_disorder_history && 'Antecedente de TCA',
        data.digestive_condition && 'Condición digestiva',
        data.food_allergies && `Alergias/intolerancias: ${data.food_allergies}`,
        data.injuries_or_surgeries && `Lesiones/cirugías: ${data.injuries_or_surgeries}`,
      ].filter((value): value is string => Boolean(value));
      setIntakeSummary(flags.length ? flags : ['Cuestionario completo sin alertas declaradas.']);
    }).catch(() => setIntakeSummary(['No se pudo cargar el cuestionario del cliente.']));
  }, [selected]);

  const createLink = async () => {
    if (!selected) return;
    setBusy('link'); setError(''); setMessage(''); setLastUrl('');
    try {
      const result = await createPortalLink(Number(selected.id), 30, setLiteMode);
      setLastUrl(result.url);
      setMessage('Enlace Lite creado. Puedes enviarlo por WhatsApp; no requiere instalar la app.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear el enlace.');
    } finally { setBusy(''); }
  };

  const updateExperience = async (mode: 'lite' | 'premium' | 'hybrid') => {
    if (!selected) return;
    setBusy('experience'); setError(''); setMessage('');
    try {
      await setClientExperienceMode(Number(selected.id), mode);
      setMessage(`Experiencia del cliente actualizada a ${mode === 'lite' ? 'Lite' : mode === 'premium' ? 'Premium' : 'Híbrida'}.`);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cambiar la experiencia.');
    } finally { setBusy(''); }
  };

  const copyLink = async () => {
    if (!lastUrl) return;
    await navigator.clipboard.writeText(lastUrl);
    setMessage('Enlace copiado al portapapeles.');
  };

  const requestPublish = async (kind: PlanKind) => {
    if (!selected) return;
    setBusy(kind); setError(''); setMessage(''); setReview(null);
    try {
      const validation = await validateProfessionalPlan(Number(selected.id), kind);
      if (!validation.can_publish) {
        setError(`Publicación bloqueada: ${validation.blockers.join(' ')}`);
        return;
      }
      if (validation.warnings.length) {
        setReview({ kind, warnings: validation.warnings, title: validation.title });
        return;
      }
      await executePublish(kind, false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo validar el plan.');
    } finally { setBusy(''); }
  };

  const executePublish = async (kind: PlanKind, acknowledgeWarnings: boolean) => {
    if (!selected) return;
    setBusy(`publish-${kind}`); setError(''); setMessage('');
    try {
      const result = await publishProfessionalPlan(Number(selected.id), kind, acknowledgeWarnings);
      setReview(null);
      setMessage(`${kind === 'routine' ? 'Entrenamiento' : 'Alimentación'} publicado como versión ${result.version}. Ya está disponible por enlace y PDF.`);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo publicar el plan.');
    } finally { setBusy(''); }
  };

  const priorityLabel: Record<AttentionItem['priority'], string> = { critical: 'Crítico', high: 'Alta', medium: 'Media', ok: 'Al día' };
  const whatsappUrl = selected && lastUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Hola ${selected.name.split(' ')[0]}, este es tu enlace personal de Imperial Fitness para revisar tus planes y enviar tu seguimiento: ${lastUrl}`)}`
    : '';

  return <div className="space-y-6">
    <div>
      <p className="text-xs font-black uppercase tracking-[.24em] text-red-500">Imperial Fitness Pro</p>
      <h1 className="mt-1 text-2xl font-black text-white">Centro de operaciones del coach</h1>
      <p className="mt-2 max-w-3xl text-sm text-neutral-400">Publica versiones profesionales, genera enlaces Lite para semipersonalizados y prioriza a quienes requieren atención.</p>
    </div>

    {error && <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">{error}</div>}
    {message && <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-4 text-sm text-emerald-200">{message}</div>}

    {review && <section className="rounded-3xl border border-amber-700/50 bg-amber-950/20 p-5">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-wider text-amber-300">Revisión profesional obligatoria</p><h2 className="mt-1 font-black text-white">{review.title}</h2></div>
        <button onClick={() => setReview(null)} className="text-neutral-400" title="Cerrar"><X className="h-5 w-5" /></button>
      </div>
      <div className="mt-4 space-y-2">{review.warnings.map((warning, index) => <div key={index} className="flex items-start gap-2 rounded-xl bg-black/30 p-3 text-sm text-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{warning}</div>)}</div>
      <p className="mt-4 text-xs text-neutral-400">Publica solo después de comprobar que estas advertencias fueron revisadas y que el plan es apropiado para esta persona.</p>
      <button onClick={() => void executePublish(review.kind, true)} disabled={!!busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-black text-black disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />He revisado las advertencias y apruebo publicar</button>
    </section>}

    <section className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[260px] flex-1"><span className="mb-1 block text-xs font-bold text-neutral-400">Cliente</span><select value={clientId} onChange={event => setClientId(event.target.value)} className="w-full rounded-xl border border-neutral-800 bg-black px-3 py-3 text-white">{clients.map(client => <option key={client.id} value={client.id}>{client.name} · {client.email}</option>)}</select></label>
        <button onClick={() => void refresh()} className="rounded-xl border border-neutral-700 p-3 text-neutral-300" title="Actualizar"><RefreshCw className="h-5 w-5" /></button>
      </div>

      {selected && <>
        <div className="mt-4 rounded-2xl border border-neutral-800 bg-black/40 p-4"><p className="text-xs font-black uppercase tracking-wider text-neutral-500">Cribado del cliente</p><div className="mt-2 flex flex-wrap gap-2">{intakeSummary.map((item, index) => <span key={index} className={`rounded-full px-2.5 py-1 text-[11px] ${item.includes('sin alertas') ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-200'}`}>{item}</span>)}</div></div>
        <label className="mt-4 flex items-start gap-3 rounded-2xl border border-neutral-800 p-3 text-sm text-neutral-300"><input type="checkbox" checked={setLiteMode} onChange={event => setSetLiteMode(event.target.checked)} className="mt-1" /><span><strong className="text-white">Marcar como cliente Lite/semipersonalizado</strong><span className="block text-xs text-neutral-500">Desactívalo si solo quieres darle un enlace adicional a un cliente Premium sin cambiar su experiencia completa.</span></span></label>
        <div className="mt-3 rounded-2xl border border-neutral-800 p-3"><p className="text-xs font-bold text-neutral-400">Experiencia del cliente</p><div className="mt-2 grid grid-cols-3 gap-2"><button onClick={() => void updateExperience('lite')} disabled={!!busy} className="rounded-xl border border-neutral-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Lite</button><button onClick={() => void updateExperience('hybrid')} disabled={!!busy} className="rounded-xl border border-neutral-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Híbrida</button><button onClick={() => void updateExperience('premium')} disabled={!!busy} className="rounded-xl border border-neutral-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Premium</button></div><p className="mt-2 text-[11px] text-neutral-500">Lite prioriza enlaces simples; Híbrida conserva app + enlaces; Premium mantiene la experiencia completa.</p></div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <button onClick={() => void createLink()} disabled={!!busy} className="rounded-2xl bg-red-600 p-4 text-left font-black text-white hover:bg-red-500 disabled:opacity-50"><Link2 className="mb-2 h-5 w-5" />Generar enlace Lite<span className="mt-1 block text-xs font-normal text-red-100">30 días · revocable · sesión limitada</span></button>
          <button onClick={() => void requestPublish('routine')} disabled={!!busy} className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4 text-left font-black text-white disabled:opacity-50"><FileText className="mb-2 h-5 w-5 text-sky-400" />Publicar entrenamiento<span className="mt-1 block text-xs font-normal text-neutral-400">Valida → revisa → versiona → PDF</span></button>
          <button onClick={() => void requestPublish('diet')} disabled={!!busy} className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4 text-left font-black text-white disabled:opacity-50"><FileText className="mb-2 h-5 w-5 text-emerald-400" />Publicar alimentación<span className="mt-1 block text-xs font-normal text-neutral-400">Valida → revisa → versiona → PDF</span></button>
        </div>
      </>}
      {busy && <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400"><Loader2 className="h-4 w-4 animate-spin" />Procesando…</div>}
      {lastUrl && <div className="mt-4 rounded-2xl border border-neutral-800 bg-black p-4"><p className="text-xs font-bold text-neutral-500">Último enlace creado</p><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input readOnly value={lastUrl} className="min-w-0 flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-300" /><button onClick={() => void copyLink()} className="flex items-center justify-center gap-1 rounded-xl border border-neutral-700 px-3 py-2 text-xs font-bold"><ClipboardCopy className="h-4 w-4" />Copiar</button><a href={lastUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-xl border border-neutral-700 px-3 py-2 text-xs font-bold"><ExternalLink className="h-4 w-4" />Abrir</a>{whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white"><MessageCircle className="h-4 w-4" />WhatsApp</a>}</div></div>}
    </section>

    <section className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="font-black text-white">Quién necesita atención</h2><p className="text-xs text-neutral-500">Dolor, adherencia, sueño, estrés, check-in, evolución y planes faltantes.</p></div><ShieldAlert className="h-5 w-5 text-amber-400" /></div>
      <div className="space-y-2">{attention.slice(0, 20).map(item => <button key={item.user_id} onClick={() => setClientId(String(item.user_id))} className="w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 text-left"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold text-white">{item.client_name}</span><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${item.priority === 'critical' ? 'bg-red-950 text-red-300' : item.priority === 'high' ? 'bg-amber-950 text-amber-300' : item.priority === 'medium' ? 'bg-sky-950 text-sky-300' : 'bg-emerald-950 text-emerald-300'}`}>{priorityLabel[item.priority]} · {item.score}</span></div><p className="mt-2 text-xs text-neutral-400">{item.reasons.length ? item.reasons.join(' · ') : 'Sin alertas activas'}</p></button>)}{!attention.length && <p className="text-sm text-neutral-500">No hay clientes que mostrar.</p>}</div>
    </section>

    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5"><h2 className="font-black text-white">Enlaces Lite</h2><div className="mt-3 max-h-[420px] space-y-2 overflow-auto">{links.map(link => <div key={link.id} className="rounded-xl bg-neutral-900 p-3"><div className="flex justify-between gap-2"><div><p className="text-sm font-bold text-white">{link.client_name}</p><p className="text-[11px] text-neutral-500">Vence {new Date(link.expires_at).toLocaleDateString()} {link.last_used_at ? `· usado ${new Date(link.last_used_at).toLocaleDateString()}` : '· sin uso'}</p></div>{link.revoked_at ? <span className="text-xs text-neutral-600">Revocado</span> : <button onClick={() => void revokePortalLink(link.id).then(refresh)} className="text-red-400" title="Revocar"><Trash2 className="h-4 w-4" /></button>}</div></div>)}</div></section>
      <section className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5"><h2 className="font-black text-white">Planes publicados</h2><div className="mt-3 max-h-[420px] space-y-2 overflow-auto">{publications.map(publication => <div key={publication.id} className="rounded-xl bg-neutral-900 p-3"><div className="flex justify-between gap-2"><div><p className="text-sm font-bold text-white">{publication.client_name} · {publication.plan_type === 'routine' ? 'Entrenamiento' : 'Alimentación'} v{publication.version}</p><p className="text-[11px] text-neutral-500">{publication.title} · {publication.status}</p></div>{publication.status === 'published' && <button onClick={() => void downloadProfessionalPdf(publication.id, `imperial-${publication.plan_type}-${publication.client_name.replace(/\s+/g, '-')}-v${publication.version}.pdf`)} className="text-neutral-300" title="Descargar PDF"><Download className="h-4 w-4" /></button>}</div>{publication.warnings.length > 0 && <p className="mt-2 flex items-start gap-1 text-[11px] text-amber-300"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{publication.warnings.join(' ')}</p>}</div>)}</div></section>
    </div>
  </div>;
}
