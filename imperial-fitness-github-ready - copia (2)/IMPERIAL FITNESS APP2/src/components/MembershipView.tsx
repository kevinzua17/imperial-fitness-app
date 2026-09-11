import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  CreditCard,
  Eye,
  Filter,
  MessageCircle,
  Receipt,
  Save,
  Settings,
  ShieldAlert,
  Upload,
  XCircle,
} from 'lucide-react';
import type { ClientProfile } from '../data/mockData';
import { CollapsibleSection } from './CollapsibleSection';
import {
  AdminMembershipRowApi,
  MembershipPaymentApi,
  MembershipSettingsApi,
  MembershipStatus,
  MyMembershipApi,
  PaymentPlanApi,
  PendingPaymentApi,
  approveMembershipPaymentInApi,
  getAdminMembershipOverviewFromApi,
  getAdminMembershipSettingsFromApi,
  getMyMembershipFromApi,
  getPendingMembershipPaymentsFromApi,
  markMembershipPaidManuallyInApi,
  rejectMembershipPaymentInApi,
  submitPaymentToApi,
  updateMembershipAccountInApi,
  updateMembershipSettingsInApi,
  uploadPaymentReceiptToApi,
} from '../services/membershipService';

interface MembershipViewProps {
  currentUser: ClientProfile;
  onMembershipUpdated?: () => void;
}

const DEFAULT_PLANS: PaymentPlanApi[] = [
  { id: 'monthly_launch', title: '1 mes Imperial', months: 1, amount: 10000, compare_at: 49000, badge: 'Lanzamiento', highlight: true, active: true },
  { id: 'quarterly_launch', title: '3 meses Imperial', months: 3, amount: 30000, compare_at: 147000, badge: 'Mejor ahorro', highlight: false, active: true },
  { id: 'semester_launch', title: '6 meses Imperial', months: 6, amount: 54000, compare_at: 294000, badge: 'Más compromiso', highlight: false, active: true },
];

const statusLabels: Record<MembershipStatus, string> = {
  trial_active: 'Prueba gratuita',
  active: 'Activo',
  expiring_soon: 'Próximo a vencer',
  pending_validation: 'Pendiente validación',
  overdue: 'Vencido',
  limited: 'Limitado',
  suspended: 'Suspendido',
};

const statusStyles: Record<MembershipStatus, string> = {
  trial_active: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  expiring_soon: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-100',
  pending_validation: 'border-orange-500/30 bg-orange-500/10 text-orange-100',
  overdue: 'border-red-500/30 bg-red-500/10 text-red-100',
  limited: 'border-red-600/40 bg-red-950/30 text-red-100',
  suspended: 'border-red-700/50 bg-red-950/60 text-red-100',
};

function money(value?: number | null, currency = 'COP') {
  const safe = Number(value || 0);
  return `$${safe.toLocaleString('es-CO')} ${currency}`;
}

function shortDate(value?: string | null) {
  if (!value) return 'Sin registrar';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysLabel(value?: string | null) {
  if (!value) return 'Sin fecha';
  const today = new Date();
  const target = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff > 0) return `Faltan ${diff} día(s)`;
  if (diff === 0) return 'Vence hoy';
  return `Vencido hace ${Math.abs(diff)} día(s)`;
}

function deadlineLabel(value?: string | null) {
  if (!value) return '';
  const target = new Date(`${String(value).slice(0, 10)}T23:59:59`);
  if (Number.isNaN(target.getTime())) return '';
  const diffDays = Math.ceil((target.getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return 'Oferta finalizada';
  if (diffDays === 0) return 'Termina hoy';
  if (diffDays === 1) return 'Termina mañana';
  return `Termina en ${diffDays} días`;
}

function savings(plan: PaymentPlanApi) {
  const compareAt = Number(plan.compare_at || 0);
  const amount = Number(plan.amount || 0);
  return compareAt > amount ? compareAt - amount : 0;
}

function whatsappLink(phone?: string | null, name?: string) {
  if (!phone) return '#';
  const clean = phone.replace(/[^0-9]/g, '');
  const text = encodeURIComponent(
    `Hola ${name || ''}, soy del equipo Imperial Fitness. Queremos ayudarte a regularizar tu membresía y mantener activo tu proceso.`,
  );
  return `https://wa.me/${clean}?text=${text}`;
}

type MembershipAccountDraft = {
  trialStartedAt: string;
  trialEndsAt: string;
  lastPaymentAt: string;
  nextPaymentDue: string;
  activatedAt: string;
  pendingValidationAt: string;
  suspendedAt: string;
  statusChangedAt: string;
  manualStatus: '' | MembershipStatus;
  manualStatusUntil: string;
  statusNote: string;
};

function dateInput(value?: string | null): string {
  return value ? String(value).slice(0, 10) : '';
}

function dateTimeInput(value?: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 16);
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function dateTimePayload(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function accountDraft(row: AdminMembershipRowApi): MembershipAccountDraft {
  const account = row.account;
  return {
    trialStartedAt: dateInput(account.trial_started_at),
    trialEndsAt: dateInput(account.trial_ends_at),
    lastPaymentAt: dateInput(account.last_payment_at),
    nextPaymentDue: dateInput(account.next_payment_due),
    activatedAt: dateTimeInput(account.activated_at),
    pendingValidationAt: dateTimeInput(account.pending_validation_at),
    suspendedAt: dateTimeInput(account.suspended_at),
    statusChangedAt: dateTimeInput(account.status_changed_at),
    manualStatus: account.manual_status || '',
    manualStatusUntil: dateInput(account.manual_status_until),
    statusNote: account.status_note || '',
  };
}

function StatusBadge({ status }: { status: MembershipStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

function getActivePlans(settings?: MembershipSettingsApi): PaymentPlanApi[] {
  const plans = (settings?.payment_plans?.length ? settings.payment_plans : DEFAULT_PLANS)
    .filter((plan) => plan.active !== false)
    .map((plan) => ({ ...plan, months: Number(plan.months || 1), amount: Number(plan.amount || settings?.monthly_price || 10000) }));
  return plans.length ? plans : DEFAULT_PLANS;
}

function OfferBanner({ settings, selectedPlan }: { settings?: MembershipSettingsApi; selectedPlan?: PaymentPlanApi }) {
  if (!settings?.launch_offer_enabled || !selectedPlan) return null;
  const timeText = deadlineLabel(settings.launch_offer_deadline);
  const spotsLimit = Number(settings.launch_spots_limit || 0);
  const spotsUsed = Number(settings.launch_spots_used || 0);
  const spotsLeft = spotsLimit > 0 ? Math.max(0, spotsLimit - spotsUsed) : null;
  const save = savings(selectedPlan);

  return (
    <div className="rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/15 via-red-950/30 to-neutral-950 p-5 shadow-[0_25px_70px_rgba(234,179,8,0.10)]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.26em] text-yellow-300 font-black">{settings.launch_offer_badge || 'Oferta activa'}</p>
          <h2 className="text-2xl md:text-3xl font-black text-white mt-1">{settings.launch_offer_title || 'Precio de lanzamiento Imperial'}</h2>
          <p className="text-sm text-neutral-300 mt-2 max-w-2xl">
            Activa tu acceso ahora y conserva rutinas, alimentación, Camino Imperial, hábitos, comunidad y seguimiento dentro de la app.
          </p>
        </div>
        <div className="rounded-2xl border border-yellow-500/30 bg-black/40 p-4 min-w-[230px]">
          <p className="text-xs text-neutral-400 uppercase font-bold">Plan seleccionado</p>
          <div className="flex items-end gap-2 mt-1">
            {selectedPlan.compare_at ? <span className="text-sm text-neutral-500 line-through">{money(selectedPlan.compare_at)}</span> : null}
            <span className="text-3xl font-black text-white">{money(selectedPlan.amount)}</span>
          </div>
          <p className="text-xs text-yellow-200 mt-2">
            {save > 0 ? `Ahorras ${money(save)}.` : 'Precio vigente.'} {timeText || 'Cupo sujeto a disponibilidad.'}
          </p>
          {spotsLeft !== null && <p className="text-[11px] text-red-200 mt-1">Quedan {spotsLeft} cupo(s) de lanzamiento.</p>}
        </div>
      </div>
    </div>
  );
}

function ClientMembershipPanel({ onMembershipUpdated }: { onMembershipUpdated?: () => void }) {
  const [data, setData] = useState<MyMembershipApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const load = () => {
    setLoading(true);
    getMyMembershipFromApi()
      .then((payload) => {
        setData(payload);
        const plans = getActivePlans(payload.settings);
        if (!selectedPlanId || !plans.some((plan) => plan.id === selectedPlanId)) {
          setSelectedPlanId(plans[0]?.id || '');
        }
      })
      .catch(() => setMsg('No se pudo cargar tu estado de membresía.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const account = data?.account;
  const settings = data?.settings;
  const plans = useMemo(() => getActivePlans(settings), [settings]);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) || plans[0];

  const copyNequi = async () => {
    if (!settings?.nequi_number) return;
    await navigator.clipboard.writeText(settings.nequi_number);
    setMsg('Número Nequi copiado.');
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setMsg('');
    try {
      const url = await uploadPaymentReceiptToApi(file);
      setReceiptUrl(url);
      setMsg('Comprobante cargado. Ahora presiona “Enviar comprobante”.');
    } catch {
      setMsg('No se pudo subir el comprobante. Intenta nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!settings || !selectedPlan) return;
    if (!receiptUrl) {
      setMsg('Primero sube el comprobante del pago.');
      return;
    }
    try {
      await submitPaymentToApi({
        amount: selectedPlan.amount,
        months: selectedPlan.months,
        plan_id: selectedPlan.id,
        reference: reference || `${selectedPlan.title} - ${selectedPlan.months} mes(es)`,
        receipt_url: receiptUrl,
      });
      setMsg('Comprobante enviado. Queda pendiente de validación administrativa.');
      setReference('');
      setReceiptUrl('');
      onMembershipUpdated?.();
      load();
    } catch {
      setMsg('No se pudo enviar el comprobante.');
    }
  };

  if (loading && !data) {
    return <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6 text-sm text-neutral-400">Cargando membresía...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-red-900/40 bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950/30 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-600/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-red-400 font-black flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Membresía Imperial
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-white mt-2">Estado de acceso</h1>
            <p className="text-sm text-neutral-400 mt-2 max-w-2xl">
              Revisa tu período activo, próximo pago y carga tu comprobante para validación del equipo Imperial Fitness.
            </p>
          </div>
          {account && <StatusBadge status={account.status} />}
        </div>
      </div>

      <OfferBanner settings={settings} selectedPlan={selectedPlan} />

      {data?.notices?.map((notice, index) => (
        <div
          key={`${notice.title}-${index}`}
          className={`rounded-2xl border p-4 ${
            notice.type === 'danger'
              ? 'border-red-500/30 bg-red-950/30 text-red-100'
              : notice.type === 'warning'
                ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-100'
                : 'border-sky-500/30 bg-sky-500/10 text-sky-100'
          }`}
        >
          <p className="font-black text-sm">{notice.title}</p>
          <p className="text-xs opacity-80 mt-1">{notice.message}</p>
        </div>
      ))}

      {data?.restricted_access && (
        <div className="rounded-3xl border border-red-600/40 bg-gradient-to-br from-red-950/40 via-neutral-950 to-black p-5 shadow-[0_25px_70px_rgba(127,29,29,0.22)]">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-red-400 mt-1" />
            <div>
              <h2 className="text-xl font-black text-white">Acceso premium en pausa</h2>
              <p className="text-sm text-neutral-300 mt-1 max-w-3xl">
                Para mantener tu proceso activo, regulariza tu membresía desde esta sección. Mientras el pago esté pendiente o vencido, el acceso a rutinas, alimentación, comunidad, chat, rachas y seguimiento queda limitado temporalmente.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <p className="text-xs uppercase tracking-wider text-neutral-500 font-bold">Fin prueba / próximo pago</p>
          <p className="text-2xl font-black text-white mt-2">{shortDate(account?.next_payment_due)}</p>
          <p className="text-xs text-neutral-500 mt-2">Fecha individual según tu registro y validaciones.</p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <p className="text-xs uppercase tracking-wider text-neutral-500 font-bold">Plan seleccionado</p>
          <p className="text-2xl font-black text-white mt-2">{selectedPlan ? money(selectedPlan.amount, settings?.currency) : money(settings?.monthly_price, settings?.currency)}</p>
          <p className="text-xs text-neutral-500 mt-2">{selectedPlan ? `${selectedPlan.months} mes(es) de acceso.` : 'Pago reportado con comprobante.'}</p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <p className="text-xs uppercase tracking-wider text-neutral-500 font-bold">Último pago</p>
          <p className="text-2xl font-black text-white mt-2">{shortDate(account?.last_payment_at)}</p>
          <p className="text-xs text-neutral-500 mt-2">Se actualiza cuando administración aprueba.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <CollapsibleSection
          title="Pagar membresía"
          description="Elige el plan, copia los datos y envía tu comprobante."
          icon={<Receipt className="w-5 h-5" />}
          defaultOpen={Boolean(data?.restricted_access)}
          contentClassName="space-y-4"
        >
          <div className="grid grid-cols-1 gap-3">
            {plans.map((plan) => {
              const save = savings(plan);
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`rounded-2xl border p-4 text-left transition-all ${selectedPlan?.id === plan.id ? 'border-yellow-400 bg-yellow-500/10' : plan.highlight ? 'border-red-500/40 bg-red-950/20 hover:bg-red-950/30' : 'border-neutral-800 bg-black/30 hover:bg-neutral-900'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">{plan.title}</p>
                      <p className="text-xs text-neutral-400 mt-1">{plan.months} mes(es) de acceso Imperial.</p>
                      {plan.badge && <p className="inline-flex mt-2 rounded-full bg-red-600/20 border border-red-500/30 px-2 py-1 text-[10px] text-red-100 font-black uppercase">{plan.badge}</p>}
                    </div>
                    <div className="text-right">
                      {plan.compare_at ? <p className="text-xs text-neutral-500 line-through">{money(plan.compare_at, settings?.currency)}</p> : null}
                      <p className="text-2xl font-black text-white">{money(plan.amount, settings?.currency)}</p>
                      {save > 0 && <p className="text-[11px] text-yellow-200">Ahorras {money(save, settings?.currency)}</p>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-black/40 p-4">
            <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Número Nequi</p>
            <div className="flex items-center justify-between gap-3 mt-2">
              <p className="text-2xl font-black text-white">{settings?.nequi_number || 'No configurado'}</p>
              <button onClick={copyNequi} className="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-900 flex items-center gap-2">
                <Copy className="w-3.5 h-3.5" /> Copiar
              </button>
            </div>
          </div>
          <p className="text-sm text-neutral-400">{settings?.payment_instructions}</p>
          <div>
            <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1">Referencia o nota del pago</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej. Pago lanzamiento - Juan Pérez"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1">Subir comprobante</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-300"
            />
            {uploading && <p className="text-xs text-neutral-500 mt-2">Subiendo comprobante privado...</p>}
            <p className="mt-2 text-[10px] text-neutral-500">Formatos permitidos: JPG, PNG o WEBP. El archivo se almacena de forma privada.</p>
            {receiptUrl && <p className="text-xs text-emerald-400 mt-2">Comprobante listo para enviar.</p>}
          </div>
          <button
            onClick={submit}
            className="w-full rounded-xl bg-red-600 hover:bg-red-500 text-white font-black py-3 flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" /> Enviar comprobante por {selectedPlan ? money(selectedPlan.amount, settings?.currency) : money(settings?.monthly_price, settings?.currency)}
          </button>
          {msg && <p className="text-xs text-red-200 bg-red-950/30 border border-red-900/40 rounded-xl p-3">{msg}</p>}
        </CollapsibleSection>

        <CollapsibleSection
          title="Historial de pagos"
          description={`${data?.payments?.length || 0} registro(s) disponibles.`}
          icon={<Clock className="w-5 h-5" />}
        >
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {data?.payments?.length ? data.payments.map((payment) => <PaymentRow key={payment.id} payment={payment} />) : (
              <p className="text-sm text-neutral-500">Aún no hay pagos registrados.</p>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

function PaymentRow({ payment }: { payment: MembershipPaymentApi }) {
  const icon = payment.status === 'approved' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : payment.status === 'rejected' ? <XCircle className="w-4 h-4 text-red-400" /> : <Clock className="w-4 h-4 text-yellow-300" />;
  return (
    <div className="rounded-2xl border border-neutral-800 bg-black/30 p-4 flex items-start justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-bold text-white">{icon} {money(payment.amount, payment.currency)}</p>
        <p className="text-xs text-neutral-500 mt-1">{shortDate(payment.submitted_at)} · {payment.method} · {payment.months_paid || 1} mes(es)</p>
        {payment.reference && <p className="text-xs text-neutral-400 mt-1">{payment.reference}</p>}
        {payment.admin_notes && <p className="text-xs text-neutral-500 mt-1">Nota: {payment.admin_notes}</p>}
      </div>
      {payment.receipt_url && (
        <a href={payment.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-red-300 hover:text-red-100 flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" /> Ver
        </a>
      )}
    </div>
  );
}

function AdminMembershipPanel() {
  const [rows, setRows] = useState<AdminMembershipRowApi[]>([]);
  const [pending, setPending] = useState<PendingPaymentApi[]>([]);
  const [filter, setFilter] = useState<'all' | MembershipStatus | 'pending_payments'>('all');
  const [msg, setMsg] = useState('');
  const [nequiNumber, setNequiNumber] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState(10000);
  const [instructions, setInstructions] = useState('');
  const [offerEnabled, setOfferEnabled] = useState(true);
  const [offerTitle, setOfferTitle] = useState('Precio de lanzamiento Imperial');
  const [offerBadge, setOfferBadge] = useState('Oferta activa por tiempo limitado');
  const [offerDeadline, setOfferDeadline] = useState('');
  const [spotsLimit, setSpotsLimit] = useState(0);
  const [spotsUsed, setSpotsUsed] = useState(0);
  const [plans, setPlans] = useState<PaymentPlanApi[]>(DEFAULT_PLANS);
  const [loading, setLoading] = useState(false);
  const [accountDrafts, setAccountDrafts] = useState<Record<number, MembershipAccountDraft>>({});
  const [savingAccountId, setSavingAccountId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([getAdminMembershipOverviewFromApi(), getPendingMembershipPaymentsFromApi(), getAdminMembershipSettingsFromApi()])
      .then(([overview, pendingRows, settings]) => {
        setRows(overview);
        setPending(pendingRows);
        setNequiNumber(settings.nequi_number || '');
        setMonthlyPrice(settings.monthly_price || 10000);
        setInstructions(settings.payment_instructions || '');
        setOfferEnabled(settings.launch_offer_enabled !== false);
        setOfferTitle(settings.launch_offer_title || 'Precio de lanzamiento Imperial');
        setOfferBadge(settings.launch_offer_badge || 'Oferta activa por tiempo limitado');
        setOfferDeadline(settings.launch_offer_deadline || '');
        setSpotsLimit(Number(settings.launch_spots_limit || 0));
        setSpotsUsed(Number(settings.launch_spots_used || 0));
        setPlans(settings.payment_plans?.length ? settings.payment_plans : DEFAULT_PLANS);
      })
      .catch(() => setMsg('No se pudo cargar membresías.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'pending_payments') return rows.filter((row) => row.pending_payments > 0);
    return rows.filter((row) => row.account.status === filter);
  }, [rows, filter]);

  const updatePlan = (index: number, patch: Partial<PaymentPlanApi>) => {
    setPlans((current) => current.map((plan, i) => (i === index ? { ...plan, ...patch } : plan)));
  };

  const saveSettings = async () => {
    try {
      const cleanPlans = plans.map((plan, index) => ({
        ...plan,
        id: plan.id || `plan_${index + 1}`,
        months: Number(plan.months || 1),
        amount: Number(plan.amount || 10000),
        compare_at: plan.compare_at ? Number(plan.compare_at) : null,
        active: plan.active !== false,
        highlight: Boolean(plan.highlight),
      }));
      await updateMembershipSettingsInApi({
        nequi_number: nequiNumber || undefined,
        monthly_price: monthlyPrice || undefined,
        payment_instructions: instructions || undefined,
        launch_offer_enabled: offerEnabled,
        launch_offer_title: offerTitle,
        launch_offer_badge: offerBadge,
        launch_offer_deadline: offerDeadline,
        launch_spots_limit: Number(spotsLimit || 0),
        launch_spots_used: Number(spotsUsed || 0),
        payment_plans: cleanPlans,
      });
      setMsg('Configuración guardada.');
      load();
    } catch {
      setMsg('No se pudo guardar configuración.');
    }
  };

  const approve = async (paymentId: number) => {
    await approveMembershipPaymentInApi(paymentId);
    setMsg('Pago aprobado y membresía actualizada.');
    load();
  };

  const reject = async (paymentId: number) => {
    const reason = window.prompt('Motivo del rechazo', 'Comprobante no válido o no coincide con el valor reportado') || 'Comprobante rechazado';
    await rejectMembershipPaymentInApi(paymentId, reason);
    setMsg('Pago rechazado.');
    load();
  };

  const markPaid = async (row: AdminMembershipRowApi) => {
    const amount = Number(window.prompt('Valor pagado', String(row.account.monthly_price || monthlyPrice || 10000)) || row.account.monthly_price || monthlyPrice || 10000);
    const months = Number(window.prompt('Meses a activar', '1') || 1);
    await markMembershipPaidManuallyInApi(row.user.id, { amount, months, reference: 'Pago manual validado por administración' });
    setMsg('Pago manual registrado.');
    load();
  };

  const updateAccountDraft = (row: AdminMembershipRowApi, patch: Partial<MembershipAccountDraft>) => {
    setAccountDrafts((current) => ({
      ...current,
      [row.user.id]: { ...(current[row.user.id] || accountDraft(row)), ...patch },
    }));
  };

  const saveAccountDates = async (row: AdminMembershipRowApi) => {
    const draft = accountDrafts[row.user.id] || accountDraft(row);
    if (!draft.trialStartedAt || !draft.trialEndsAt || !draft.nextPaymentDue) {
      setMsg('Inicio de prueba, fin de prueba y próximo vencimiento son obligatorios.');
      return;
    }
    if (draft.trialEndsAt < draft.trialStartedAt) {
      setMsg('La fecha final de prueba no puede ser anterior a su inicio.');
      return;
    }
    const modeText = draft.manualStatus ? `estado manual “${statusLabels[draft.manualStatus]}”` : 'cálculo automático por fechas y pagos';
    if (!window.confirm(`Guardar fechas de ${row.user.name} con ${modeText}?`)) return;

    setSavingAccountId(row.user.id);
    setMsg('');
    try {
      const updated = await updateMembershipAccountInApi(row.user.id, {
        trial_started_at: draft.trialStartedAt,
        trial_ends_at: draft.trialEndsAt,
        last_payment_at: draft.lastPaymentAt || null,
        next_payment_due: draft.nextPaymentDue,
        activated_at: dateTimePayload(draft.activatedAt),
        pending_validation_at: dateTimePayload(draft.pendingValidationAt),
        suspended_at: dateTimePayload(draft.suspendedAt),
        status_changed_at: dateTimePayload(draft.statusChangedAt),
        manual_status: draft.manualStatus || null,
        manual_status_until: draft.manualStatus ? (draft.manualStatusUntil || null) : null,
        status_note: draft.statusNote.trim(),
        clear_manual_status: !draft.manualStatus,
      });
      setRows((current) => current.map((item) => (item.user.id === row.user.id ? { ...item, account: updated } : item)));
      setAccountDrafts((current) => ({
        ...current,
        [row.user.id]: accountDraft({ ...row, account: updated }),
      }));
      setMsg(`Fechas y estado de ${row.user.name} actualizados.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : '';
      setMsg(detail || 'No se pudieron guardar las fechas de membresía.');
    } finally {
      setSavingAccountId(null);
    }
  };

  const counts = useMemo(() => ({
    all: rows.length,
    active: rows.filter((r) => r.account.status === 'active').length,
    expiring_soon: rows.filter((r) => r.account.status === 'expiring_soon').length,
    pending_validation: rows.filter((r) => r.account.status === 'pending_validation').length,
    overdue: rows.filter((r) => r.account.status === 'overdue').length,
    limited: rows.filter((r) => r.account.status === 'limited').length,
    suspended: rows.filter((r) => r.account.status === 'suspended').length,
    pending_payments: rows.filter((r) => r.pending_payments > 0).length,
  }), [rows]);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-red-900/40 bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950/30 p-6">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-600/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-red-400 font-black flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Control económico interno
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-white mt-2">Membresías y pagos</h1>
            <p className="text-sm text-neutral-400 mt-2 max-w-2xl">
              Consulta fechas, aplica estados temporales y abre solo el cliente que necesitas editar.
            </p>
          </div>
          <button onClick={load} className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-900">
            Actualizar
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Filter className="w-4 h-4 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-black text-white">Filtro de membresías</p>
            <p className="text-[11px] text-neutral-500">{loading ? 'Cargando…' : `${filtered.length} de ${rows.length} clientes`}</p>
          </div>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="md:ml-auto w-full md:w-auto rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white"
        >
          <option value="all">Todos ({counts.all})</option>
          <option value="active">Activos ({counts.active})</option>
          <option value="expiring_soon">Próximos a vencer ({counts.expiring_soon})</option>
          <option value="pending_validation">Pendientes de validación ({counts.pending_validation})</option>
          <option value="overdue">Vencidos ({counts.overdue})</option>
          <option value="limited">Limitados ({counts.limited})</option>
          <option value="suspended">Suspendidos ({counts.suspended})</option>
          <option value="pending_payments">Con comprobantes ({counts.pending_payments})</option>
        </select>
      </div>

      <CollapsibleSection
        title="Configuración de pagos y oferta"
        description="Nequi, valor mensual, instrucciones, cupos y planes visibles para clientes."
        icon={<Settings className="w-5 h-5" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={nequiNumber} onChange={(e) => setNequiNumber(e.target.value)} placeholder="Número Nequi" className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white" />
          <input type="number" value={monthlyPrice} onChange={(e) => setMonthlyPrice(Number(e.target.value))} placeholder="Valor base mensual" className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white" />
          <button onClick={saveSettings} className="rounded-xl bg-red-600 hover:bg-red-500 text-white font-black px-4 py-2 text-sm">Guardar configuración</button>
        </div>
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Instrucciones de pago visibles para el cliente" className="mt-3 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white min-h-[80px]" />

        <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-white">Oferta de lanzamiento visible al cliente</p>
              <p className="text-xs text-neutral-400 mt-1">Urgencia real por fecha, cupos y planes por meses.</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-neutral-300">
              <input type="checkbox" checked={offerEnabled} onChange={(e) => setOfferEnabled(e.target.checked)} /> Activa
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
            <input value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)} placeholder="Título oferta" className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white" />
            <input value={offerBadge} onChange={(e) => setOfferBadge(e.target.value)} placeholder="Etiqueta urgencia" className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white" />
            <input type="date" value={offerDeadline} onChange={(e) => setOfferDeadline(e.target.value)} className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={spotsLimit} onChange={(e) => setSpotsLimit(Number(e.target.value))} placeholder="Cupos" className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white" />
              <input type="number" value={spotsUsed} onChange={(e) => setSpotsUsed(Number(e.target.value))} placeholder="Usados" className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
            {plans.slice(0, 3).map((plan, index) => (
              <div key={plan.id || index} className="rounded-2xl border border-neutral-800 bg-black/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-white uppercase">Plan {index + 1}</p>
                  <label className="text-[11px] text-neutral-400 flex items-center gap-1"><input type="checkbox" checked={plan.active !== false} onChange={(e) => updatePlan(index, { active: e.target.checked })} /> visible</label>
                </div>
                <input value={plan.title} onChange={(e) => updatePlan(index, { title: e.target.value })} placeholder="Nombre" className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-2 text-xs text-white" />
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" value={plan.months} onChange={(e) => updatePlan(index, { months: Number(e.target.value) })} placeholder="Meses" className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-2 text-xs text-white" />
                  <input type="number" value={plan.amount} onChange={(e) => updatePlan(index, { amount: Number(e.target.value) })} placeholder="Ahora" className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-2 text-xs text-white" />
                  <input type="number" value={plan.compare_at || ''} onChange={(e) => updatePlan(index, { compare_at: Number(e.target.value || 0) })} placeholder="Tachado" className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-2 text-xs text-white" />
                </div>
                <input value={plan.badge || ''} onChange={(e) => updatePlan(index, { badge: e.target.value })} placeholder="Etiqueta del plan" className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-2 text-xs text-white" />
                <label className="text-[11px] text-neutral-400 flex items-center gap-1"><input type="checkbox" checked={Boolean(plan.highlight)} onChange={(e) => updatePlan(index, { highlight: e.target.checked })} /> destacar este plan</label>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-neutral-500 mt-3">Usa precio tachado solo cuando sea una referencia comercial real.</p>
        </div>
      </CollapsibleSection>

      {pending.length > 0 && (
        <CollapsibleSection
          title="Comprobantes pendientes"
          description={`${pending.length} pago(s) esperan revisión administrativa.`}
          badge={<span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[10px] font-black text-orange-100">{pending.length}</span>}
          icon={<Receipt className="w-5 h-5" />}
          defaultOpen
          className="border-orange-500/30"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {pending.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-orange-500/20 bg-black/30 p-4">
                <p className="font-black text-white">{payment.name}</p>
                <p className="text-xs text-neutral-400">{payment.email} · {money(payment.amount, payment.currency)} · {payment.months_paid || 1} mes(es)</p>
                {payment.reference && <p className="text-xs text-neutral-400 mt-1">Ref: {payment.reference}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  {payment.receipt_url && <a href={payment.receipt_url} target="_blank" rel="noreferrer" className="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-200 flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Ver comprobante</a>}
                  <button onClick={() => approve(payment.id)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">Aprobar</button>
                  <button onClick={() => reject(payment.id)} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white">Rechazar</button>
                  {payment.phone_number && <a href={whatsappLink(payment.phone_number, payment.name)} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-500/40 px-3 py-2 text-xs text-emerald-200 flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Clientes y fechas de membresía"
        description="Cada cliente permanece resumido; abre únicamente el registro que quieras revisar o modificar."
        badge={<span className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-[10px] font-black text-neutral-300">{filtered.length}</span>}
        icon={<CalendarClock className="w-5 h-5" />}
        defaultOpen
      >
        <div className="space-y-3">
          {filtered.map((row) => {
            const draft = accountDrafts[row.user.id] || accountDraft(row);
            return (
              <details key={row.user.id} className="group rounded-2xl border border-neutral-800 bg-black/30 overflow-hidden">
                <summary className="list-none cursor-pointer px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-white truncate">{row.user.name}</p>
                    <p className="text-xs text-neutral-500 truncate">{row.user.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <StatusBadge status={row.account.status} />
                    <span className="text-xs text-neutral-400">Vence: {shortDate(row.account.next_payment_due)}</span>
                    {row.account.manual_status && <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[10px] font-black text-purple-100">Manual</span>}
                    <ChevronDown className="w-4 h-4 text-neutral-500 transition-transform group-open:rotate-180" />
                  </div>
                </summary>

                <div className="border-t border-neutral-800 p-4 space-y-4">
                  <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs text-sky-100">
                    Las fechas de membresía controlan el acceso premium. El estado de acceso a la cuenta se administra por separado en Usuarios.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    <label className="text-xs text-neutral-400">Inicio de prueba
                      <input type="date" value={draft.trialStartedAt} onChange={(e) => updateAccountDraft(row, { trialStartedAt: e.target.value })} className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="text-xs text-neutral-400">Fin de prueba
                      <input type="date" value={draft.trialEndsAt} onChange={(e) => updateAccountDraft(row, { trialEndsAt: e.target.value })} className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="text-xs text-neutral-400">Último pago
                      <input type="date" value={draft.lastPaymentAt} onChange={(e) => updateAccountDraft(row, { lastPaymentAt: e.target.value })} className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="text-xs text-neutral-400">Próximo vencimiento
                      <input type="date" value={draft.nextPaymentDue} onChange={(e) => updateAccountDraft(row, { nextPaymentDue: e.target.value })} className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="text-xs text-neutral-400">Fecha de activación
                      <input type="datetime-local" value={draft.activatedAt} onChange={(e) => updateAccountDraft(row, { activatedAt: e.target.value })} className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="text-xs text-neutral-400">Pendiente de validación desde
                      <input type="datetime-local" value={draft.pendingValidationAt} onChange={(e) => updateAccountDraft(row, { pendingValidationAt: e.target.value })} className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="text-xs text-neutral-400">Fecha de suspensión
                      <input type="datetime-local" value={draft.suspendedAt} onChange={(e) => updateAccountDraft(row, { suspendedAt: e.target.value })} className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="text-xs text-neutral-400">Último cambio de estado
                      <input type="datetime-local" value={draft.statusChangedAt} onChange={(e) => updateAccountDraft(row, { statusChangedAt: e.target.value })} className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white" />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="text-xs text-neutral-400">Control del estado
                      <select value={draft.manualStatus} onChange={(e) => updateAccountDraft(row, { manualStatus: e.target.value as MembershipAccountDraft['manualStatus'] })} className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white">
                        <option value="">Automático según fechas y pagos</option>
                        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-neutral-400">Estado manual hasta (opcional)
                      <input type="date" value={draft.manualStatusUntil} disabled={!draft.manualStatus} onChange={(e) => updateAccountDraft(row, { manualStatusUntil: e.target.value })} className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-40" />
                    </label>
                    <label className="text-xs text-neutral-400">Nota administrativa
                      <input value={draft.statusNote} maxLength={500} onChange={(e) => updateAccountDraft(row, { statusNote: e.target.value })} placeholder="Motivo del ajuste" className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white" />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button disabled={savingAccountId === row.user.id} onClick={() => saveAccountDates(row)} className="rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 px-4 py-2 text-xs font-black text-white flex items-center gap-2">
                      <Save className="w-4 h-4" /> {savingAccountId === row.user.id ? 'Guardando…' : 'Guardar fechas y estado'}
                    </button>
                    <button onClick={() => markPaid(row)} className="rounded-xl border border-emerald-500/40 px-4 py-2 text-xs text-emerald-200 hover:bg-emerald-500/10">Marcar pago</button>
                    {row.user.phone_number && <a href={whatsappLink(row.user.phone_number, row.user.name)} target="_blank" rel="noreferrer" className="rounded-xl border border-neutral-700 px-4 py-2 text-xs text-neutral-200 flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>}
                  </div>
                </div>
              </details>
            );
          })}
          {!filtered.length && <p className="rounded-2xl border border-neutral-800 bg-black/20 p-5 text-sm text-neutral-500">No hay clientes para este filtro.</p>}
        </div>
      </CollapsibleSection>

      {msg && <p className="rounded-xl border border-red-900/40 bg-red-950/30 p-3 text-xs text-red-100">{msg}</p>}
    </div>
  );
}

export const MembershipView: React.FC<MembershipViewProps> = ({ currentUser, onMembershipUpdated }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      {currentUser.role === 'client' ? (
        <ClientMembershipPanel onMembershipUpdated={onMembershipUpdated} />
      ) : (
        <AdminMembershipPanel />
      )}
    </div>
  );
};
