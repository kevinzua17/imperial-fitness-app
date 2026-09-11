import React, { useEffect, useState } from 'react';
import { Coins, Gift, Plus, Trophy } from 'lucide-react';
import { ClientProfile } from '../data/mockData';
import { RewardEventApi, RewardProductApi, createRewardProductInApi, getRewardBalanceFromApi, listRewardEventsFromApi, listRewardProductsFromApi, redeemRewardProductInApi } from '../services/rewardService';

interface TokenShopViewProps {
  currentUser: ClientProfile;
  onSwitchTab: (tab: string) => void;
}

export const TokenShopView: React.FC<TokenShopViewProps> = ({ currentUser, onSwitchTab }) => {
  const [balance, setBalance] = useState(currentUser.tokens || 0);
  const [products, setProducts] = useState<RewardProductApi[]>([]);
  const [events, setEvents] = useState<RewardEventApi[]>([]);
  const [msg, setMsg] = useState('');
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState(100);
  const [stock, setStock] = useState(1);

  const loadRewards = () => {
    Promise.all([getRewardBalanceFromApi(), listRewardProductsFromApi(), listRewardEventsFromApi()])
      .then(([balanceData, productData, eventData]) => {
        setBalance(balanceData.balance);
        setProducts(productData);
        setEvents(eventData);
      })
      .catch(() => setMsg('No se pudo cargar recompensas. Intenta nuevamente.'));
  };

  useEffect(() => { loadRewards(); }, []);

  const redeem = (productId: number) => {
    redeemRewardProductInApi(productId)
      .then(result => { setBalance(result.balance); setMsg('Canje solicitado correctamente.'); loadRewards(); })
      .catch(() => setMsg('No se pudo canjear. Verifica saldo o stock.'));
  };

  const createProduct = (e: React.FormEvent) => {
    e.preventDefault();
    createRewardProductInApi({ title, description: 'Producto creado desde el panel de recompensas.', cost, stock })
      .then(product => { setProducts(prev => [product, ...prev]); setTitle(''); setCost(100); setStock(1); setMsg('Producto creado.'); })
      .catch(() => setMsg('No se pudo crear producto.'));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900 to-black p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-900/60 bg-amber-950/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3"><Coins className="w-3.5 h-3.5" /> Recompensas</div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Recompensas reales</h1>
        <p className="text-sm text-neutral-400 mt-2 max-w-2xl">Consulta tu saldo, revisa recompensas activas y canjea beneficios disponibles.</p>
      </div>
      {msg && <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">{msg}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-center"><Coins className="w-8 h-8 text-amber-500 mx-auto mb-2" /><span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Balance actual</span><strong className="text-4xl font-black text-amber-400 font-mono block mt-1">{balance.toLocaleString()}</strong></div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"><Gift className="w-5 h-5 text-red-500 mb-3" /><span className="text-sm font-bold text-white block">Productos activos</span><strong className="text-3xl font-black text-white font-mono">{products.length}</strong></div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"><Trophy className="w-5 h-5 text-emerald-500 mb-3" /><span className="text-sm font-bold text-white block">Eventos registrados</span><strong className="text-3xl font-black text-white font-mono">{events.length}</strong></div>
      </div>
      {currentUser.role === 'admin' && <form onSubmit={createProduct} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 grid grid-cols-1 md:grid-cols-4 gap-3"><input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Producto" className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /><input type="number" value={cost} onChange={e => setCost(Number(e.target.value))} className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /><input type="number" value={stock} onChange={e => setStock(Number(e.target.value))} className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /><button className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1"><Plus className="w-4 h-4" /> Crear</button></form>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{products.map(product => <div key={product.id} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"><span className="text-sm font-bold text-white block">{product.title}</span><p className="text-xs text-neutral-500 mt-1 min-h-[36px]">{product.description || 'Sin descripción'}</p><div className="flex justify-between text-xs mt-4"><span className="text-amber-400 font-bold">{product.cost} tokens</span><span className="text-neutral-500">Stock {product.stock}</span></div><button onClick={() => redeem(product.id)} className="mt-4 w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white text-xs font-bold py-2 rounded-lg">Canjear</button></div>)}{products.length === 0 && <div className="col-span-full rounded-2xl border border-neutral-800 bg-neutral-950 p-12 text-center text-xs text-neutral-500">No hay productos de recompensa creados todavía.</div>}</div>
      <button onClick={() => onSwitchTab('challenges')} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl">Ver retos activos</button>
    </div>
  );
};