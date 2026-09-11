import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { ClientProfile } from '../data/mockData';
import { approveNutritionSafetyReviewFromApi } from '../services/nutritionService';

interface NutritionSafetyReviewCardProps {
  client: ClientProfile;
}

const patternLabels: Record<string, string> = {
  omnivore: 'Omnívoro',
  flexitarian: 'Flexitariano',
  pescatarian: 'Pescetariano',
  vegetarian: 'Vegetariano',
  vegan: 'Vegano',
};

export const NutritionSafetyReviewCard: React.FC<NutritionSafetyReviewCardProps> = ({ client }) => {
  const [reviewed, setReviewed] = useState(Boolean(client.nutritionReviewedAt));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fields = useMemo(() => [
    ['Patrón', patternLabels[client.eatingPattern || ''] || client.eatingPattern || 'No declarado'],
    ['Preferencias', client.dietaryPreferences || 'Sin registrar'],
    ['No consume', client.excludedFoods || 'Sin registrar'],
    ['Alergias', client.foodAllergies || 'Sin registrar'],
    ['Intolerancias', client.foodIntolerances || 'Sin registrar'],
    ['Condición relevante', client.medicalConditions || 'Sin registrar'],
    ['Medicamentos', client.medications || 'Sin registrar'],
  ], [client]);

  const reviewRequired = Boolean(
    (client.eatingPattern && client.eatingPattern !== 'omnivore')
    || client.excludedFoods
    || client.foodAllergies
    || client.foodIntolerances
    || client.medicalConditions
    || client.medications
  );

  const approve = async () => {
    setSaving(true);
    setMessage('');
    try {
      const result = await approveNutritionSafetyReviewFromApi(client.id);
      setReviewed(Boolean(result.ok));
      setMessage('Ficha confirmada. El servidor permitirá publicar solo si el menú también es compatible con las restricciones registradas.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible registrar la revisión.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-amber-900/40 bg-amber-950/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="rounded-xl bg-amber-500/10 p-2.5 text-amber-300"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Seguridad nutricional</span>
            <h3 className="mt-1 text-sm font-black text-white">Ficha alimentaria de {client.name}</h3>
            <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-neutral-400">
              La app bloquea la publicación cuando hay restricciones relevantes sin revisar y vuelve a validar el contenido del menú antes de publicarlo.
            </p>
          </div>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${reviewRequired && !reviewed ? 'border-amber-700 bg-amber-950/50 text-amber-200' : 'border-emerald-800 bg-emerald-950/40 text-emerald-300'}`}>
          {reviewRequired && !reviewed ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {reviewRequired && !reviewed ? 'REVISIÓN PENDIENTE' : reviewed ? 'REVISADA' : 'SIN ALERTAS DECLARADAS'}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-neutral-800 bg-black/30 p-2.5">
            <span className="block text-[9px] font-black uppercase text-neutral-500">{label}</span>
            <span className="mt-1 block text-[11px] leading-relaxed text-neutral-200">{value}</span>
          </div>
        ))}
      </div>

      {reviewRequired && !reviewed && (
        <button type="button" disabled={saving} onClick={() => void approve()} className="mt-4 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-black transition hover:bg-amber-400 disabled:opacity-50">
          {saving ? 'Registrando revisión…' : 'Confirmar revisión profesional de la ficha'}
        </button>
      )}
      {message && <p className="mt-3 text-[11px] leading-relaxed text-neutral-300">{message}</p>}
    </section>
  );
};
