import React, { useEffect, useState } from 'react';
import { DollarSign, Plus, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { ClientProfile } from '../data/mockData';
import { FinanceSummaryApi, createExpenseInApi, createPaymentInApi, getFinanceSummaryFromApi } from '../services/financeService';

interface FinanceViewProps { users: ClientProfile[]; }

export const FinanceView: React.FC<FinanceViewProps> = ({ users }) => {
  const [summary, setSummary] = useState<FinanceSummaryApi | null>(null);
  const [msg, setMsg] = useState('');
  const [amount, setAmount] = useState(0);
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [expenseTitle, setExpenseTitle] = useState('Gasto operativo');
  const activeClients = users.filter(user => user.role === 'client' && user.status === 'active');
  const load = () => getFinanceSummaryFromApi().then(setSummary).catch(() => setMsg('No se pudo cargar resumen financiero.'));
  useEffect(() => { load(); }, []);

  const createPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const firstClient = activeClients[0];
    if (!firstClient) { setMsg('No hay clientes activos para registrar pago.'); return; }
    createPaymentInApi({ user_id: Number(firstClient.id), amount, method: 'manual', reference: 'registro-admin' }).then(() => { setMsg('Pago registrado.'); setAmount(0); load(); }).catch(() => setMsg('No se pudo registrar pago.'));
  };
  const createExpense = (e: React.FormEvent) => {
    e.preventDefault();
    createExpenseInApi({ title: expenseTitle, amount: expenseAmount, category: 'operativo' }).then(() => { setMsg('Gasto registrado.'); setExpenseAmount(0); load(); }).catch(() => setMsg('No se pudo registrar gasto.'));
  };

  return <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in"><div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900 to-black p-6"><div className="inline-flex items-center gap-2 rounded-full border border-red-900/60 bg-red-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400 mb-3"><DollarSign className="w-3.5 h-3.5" /> Finanzas reales</div><h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Control financiero básico</h1><p className="text-sm text-neutral-400 mt-2 max-w-2xl">Pagos, gastos y membresías salen del backend. Si no hay registros, verás cero.</p></div>{msg && <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">{msg}</div>}<div className="grid grid-cols-1 md:grid-cols-5 gap-4"><Card icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} title="Ingresos mes" value={`$${Math.round(summary?.income_month || 0).toLocaleString()}`} /><Card icon={<TrendingDown className="w-4 h-4 text-red-500" />} title="Gastos mes" value={`$${Math.round(summary?.expenses_month || 0).toLocaleString()}`} /><Card icon={<DollarSign className="w-4 h-4 text-amber-500" />} title="Neto mes" value={`$${Math.round(summary?.net_month || 0).toLocaleString()}`} /><Card icon={<Users className="w-4 h-4 text-sky-500" />} title="Membresías" value={`${summary?.active_memberships || 0}`} /><Card icon={<Users className="w-4 h-4 text-purple-400" />} title="Vencen pronto" value={`${summary?.expiring_soon || 0}`} /></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><form onSubmit={createPayment} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 space-y-3"><h2 className="text-sm font-bold text-white uppercase">Registrar pago manual</h2><input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} placeholder="Valor" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /><button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1"><Plus className="w-4 h-4" /> Guardar pago</button><p className="text-[11px] text-neutral-500">Se asigna al primer cliente activo mientras se crea selector de usuario.</p></form><form onSubmit={createExpense} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 space-y-3"><h2 className="text-sm font-bold text-white uppercase">Registrar gasto</h2><input value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /><input type="number" value={expenseAmount} onChange={e => setExpenseAmount(Number(e.target.value))} placeholder="Valor" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /><button className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1"><Plus className="w-4 h-4" /> Guardar gasto</button></form></div></div>;
};

const Card: React.FC<{ icon: React.ReactNode; title: string; value: string }> = ({ icon, title, value }) => <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4"><div className="flex justify-between items-start mb-2"><span className="text-[10px] text-neutral-500 uppercase tracking-wider">{title}</span>{icon}</div><strong className="text-xl font-black text-white font-mono">{value}</strong></div>;