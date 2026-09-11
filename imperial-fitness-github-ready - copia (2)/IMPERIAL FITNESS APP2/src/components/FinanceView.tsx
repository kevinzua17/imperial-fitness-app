import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, DollarSign, Plus, RefreshCw, TrendingDown, TrendingUp, UserMinus, Users } from 'lucide-react';
import { ClientProfile } from '../data/mockData';
import {
  FinanceAnalyticsApi,
  createExpenseInApi,
  getFinanceAnalyticsFromApi,
  markMembershipPaidInApi,
} from '../services/financeService';

interface FinanceViewProps { users: ClientProfile[]; }

const money = (value: number) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(value || 0);

export const FinanceView: React.FC<FinanceViewProps> = ({ users }) => {
  const [analytics, setAnalytics] = useState<FinanceAnalyticsApi | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const clients = useMemo(() => users.filter(user => user.role === 'client'), [users]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [amount, setAmount] = useState(9900);
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [expenseTitle, setExpenseTitle] = useState('Gasto operativo');

  useEffect(() => {
    if (!selectedClientId && clients[0]) setSelectedClientId(clients[0].id);
  }, [clients, selectedClientId]);

  const load = async () => {
    setLoading(true);
    try {
      setAnalytics(await getFinanceAnalyticsFromApi());
      setMsg('');
    } catch {
      setMsg('No se pudieron cargar las analíticas. Intenta nuevamente o verifica tu sesión.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const registerPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClientId || amount <= 0) return setMsg('Selecciona un cliente y un valor válido.');
    try {
      await markMembershipPaidInApi(Number(selectedClientId), amount);
      setMsg('Pago aplicado a la membresía correcta.');
      await load();
    } catch {
      setMsg('No se pudo registrar el pago en el sistema de membresías.');
    }
  };

  const createExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!expenseTitle.trim() || expenseAmount <= 0) return setMsg('Completa el concepto y un valor de gasto válido.');
    try {
      await createExpenseInApi({ title: expenseTitle.trim(), amount: expenseAmount, category: 'operativo' });
      setExpenseAmount(0);
      setMsg('Gasto registrado.');
      await load();
    } catch {
      setMsg('No se pudo registrar el gasto.');
    }
  };

  const engagement = analytics?.engagement;
  const financial = analytics?.financial;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900 to-red-950/30 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-900/60 bg-red-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400 mb-3"><Activity className="w-3.5 h-3.5" /> Analíticas administrativas</div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Actividad, retención e ingresos reales</h1>
            <p className="text-sm text-neutral-400 mt-2 max-w-3xl">Actividad significa uso registrado durante los últimos 7 días; no solo que la cuenta esté habilitada. Los ingresos se leen del flujo real de membresías y comprobantes.</p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:border-red-600 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button>
        </div>
      </div>

      {msg && <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">{msg}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-4">
        <Card icon={<Users className="w-4 h-4 text-emerald-400" />} title="Activos 7 días" value={`${engagement?.active_7d || 0}`} hint={`de ${engagement?.total_clients || 0} clientes`} />
        <Card icon={<AlertTriangle className="w-4 h-4 text-amber-400" />} title="En riesgo" value={`${engagement?.at_risk_8_30d || 0}`} hint="8–30 días sin actividad" />
        <Card icon={<UserMinus className="w-4 h-4 text-red-400" />} title="Inactivos" value={`${(engagement?.inactive_30d || 0) + (engagement?.never_active || 0)}`} hint=">30 días o sin registros" />
        <Card icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} title="Ingresos mes" value={money(financial?.income_month || 0)} hint={`${financial?.income_change_percent || 0}% vs. mes anterior`} />
        <Card icon={<TrendingDown className="w-4 h-4 text-red-500" />} title="Ingreso en riesgo" value={money(financial?.at_risk_or_lost_revenue || 0)} hint="vencidas, limitadas o suspendidas" />
        <Card icon={<DollarSign className="w-4 h-4 text-amber-500" />} title="Neto mes" value={money(financial?.net_month || 0)} hint={`Gastos: ${money(financial?.expenses_month || 0)}`} />
        <Card icon={<TrendingDown className="w-4 h-4 text-orange-400" />} title="Días sin ventas" value={`${financial?.no_sales_days_month || 0}`} hint={financial?.last_sale_at ? `Última: ${new Date(financial.last_sale_at).toLocaleDateString('es-CO')}` : 'Aún no hay ventas registradas'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ActivityChart analytics={analytics} />
        <RevenueChart analytics={analytics} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <MembershipStatus analytics={analytics} />
        <div className="xl:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <h2 className="text-sm font-black text-white uppercase tracking-wider mb-4">Clientes que requieren seguimiento</h2>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {(analytics?.inactive_users || []).length ? analytics?.inactive_users.map(user => (
              <div key={user.user_id} className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2">
                <span className="text-xs font-semibold text-white">{user.name}</span>
                <span className={`text-[10px] rounded-full px-2 py-1 ${user.days_inactive === null || user.days_inactive > 30 ? 'bg-red-950 text-red-300' : 'bg-amber-950 text-amber-300'}`}>{user.days_inactive === null ? 'Sin actividad registrada' : `${user.days_inactive} días sin actividad`}</span>
              </div>
            )) : <p className="text-xs text-neutral-500">No hay clientes inactivos en el corte actual.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={registerPayment} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 space-y-3">
          <h2 className="text-sm font-bold text-white uppercase">Registrar pago de membresía</h2>
          <select value={selectedClientId} onChange={event => setSelectedClientId(event.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white">
            <option value="">Seleccionar cliente</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <input type="number" min={1000} value={amount} onChange={event => setAmount(Number(event.target.value))} placeholder="Valor" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" />
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1"><Plus className="w-4 h-4" /> Aplicar a membresía</button>
        </form>
        <form onSubmit={createExpense} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 space-y-3">
          <h2 className="text-sm font-bold text-white uppercase">Registrar gasto</h2>
          <input value={expenseTitle} onChange={event => setExpenseTitle(event.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" />
          <input type="number" min={1} value={expenseAmount} onChange={event => setExpenseAmount(Number(event.target.value))} placeholder="Valor" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" />
          <button className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1"><Plus className="w-4 h-4" /> Guardar gasto</button>
        </form>
      </div>
    </div>
  );
};

const Card: React.FC<{ icon: React.ReactNode; title: string; value: string; hint: string }> = ({ icon, title, value, hint }) => <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4"><div className="flex justify-between items-start mb-2"><span className="text-[10px] text-neutral-500 uppercase tracking-wider">{title}</span>{icon}</div><strong className="text-xl font-black text-white font-mono block truncate">{value}</strong><span className="text-[9px] text-neutral-600">{hint}</span></div>;

const ActivityChart: React.FC<{ analytics: FinanceAnalyticsApi | null }> = ({ analytics }) => {
  const rows = [
    ['Activos 0–7 días', analytics?.engagement.active_7d || 0, 'bg-emerald-500'],
    ['En riesgo 8–30 días', analytics?.engagement.at_risk_8_30d || 0, 'bg-amber-500'],
    ['Inactivos +30 días', analytics?.engagement.inactive_30d || 0, 'bg-red-500'],
    ['Sin actividad', analytics?.engagement.never_active || 0, 'bg-neutral-500'],
  ] as const;
  const max = Math.max(1, ...(rows.map(row => row[1])));
  return <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"><h2 className="text-sm font-black text-white uppercase tracking-wider mb-5">Actividad de clientes</h2><div className="space-y-4">{rows.map(([label, value, color]) => <div key={label}><div className="flex justify-between text-[11px] mb-1"><span className="text-neutral-400">{label}</span><strong className="text-white">{value}</strong></div><div className="h-3 rounded-full bg-neutral-900 overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} /></div></div>)}</div></div>;
};

const RevenueChart: React.FC<{ analytics: FinanceAnalyticsApi | null }> = ({ analytics }) => {
  const rows = analytics?.monthly_series || [];
  const max = Math.max(1, ...rows.flatMap(row => [row.income, row.expenses]));
  return <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"><div className="flex items-start justify-between mb-4 gap-3"><div><h2 className="text-sm font-black text-white uppercase tracking-wider">Ingresos y gastos · 6 meses</h2><p className="text-[9px] text-neutral-600 mt-1">{analytics?.financial.sales_count_month || 0} ventas este mes · ticket promedio {money(analytics?.financial.average_ticket_month || 0)}</p></div><span className="text-[9px] text-neutral-600">Verde: ingresos · rojo: gastos</span></div><div className="h-56 flex items-end gap-3">{rows.map(row => <div key={row.month} className="flex-1 h-full flex flex-col justify-end"><div className="flex-1 flex items-end justify-center gap-1"><div title={money(row.income)} className="w-2/5 rounded-t bg-emerald-500 min-h-[2px]" style={{ height: `${(row.income / max) * 100}%` }} /><div title={money(row.expenses)} className="w-2/5 rounded-t bg-red-500 min-h-[2px]" style={{ height: `${(row.expenses / max) * 100}%` }} /></div><span className="mt-2 text-center text-[9px] text-neutral-600">{row.month.slice(5)}</span></div>)}</div></div>;
};

const MembershipStatus: React.FC<{ analytics: FinanceAnalyticsApi | null }> = ({ analytics }) => {
  const values = analytics?.membership_status;
  const rows = [
    ['Activas', values?.active || 0], ['Prueba', values?.trial || 0], ['Pago en revisión', values?.pending || 0],
    ['Vencidas', values?.overdue || 0], ['Limitadas', values?.limited || 0], ['Suspendidas', values?.suspended || 0],
  ];
  return <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"><h2 className="text-sm font-black text-white uppercase tracking-wider mb-4">Estado de membresías</h2><div className="grid grid-cols-2 gap-2">{rows.map(([label, value]) => <div key={label} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3"><span className="block text-[9px] uppercase text-neutral-500">{label}</span><strong className="text-xl text-white">{value}</strong></div>)}</div></div>;
};
