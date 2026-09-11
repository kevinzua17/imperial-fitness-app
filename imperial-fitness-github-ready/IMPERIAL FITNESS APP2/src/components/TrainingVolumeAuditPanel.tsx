import React, { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Download, Loader2 } from 'lucide-react';
import type { ClientProfile, WorkoutRoutine } from '../data/mockData';
import { calculateWeeklyVolume } from '../utils/trainingVolume';
import { downloadClientPlanPdfFromApi } from '../services/reportService';

interface TrainingVolumeAuditPanelProps {
  client: ClientProfile;
  routine?: WorkoutRoutine | null;
}

export const TrainingVolumeAuditPanel: React.FC<TrainingVolumeAuditPanelProps> = ({ client, routine }) => {
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');
  const volume = useMemo(() => calculateWeeklyVolume(routine), [routine]);
  const alerts = volume.filter(item => item.classification !== 'target');

  const download = async () => {
    setDownloading(true);
    setMessage('');
    try {
      await downloadClientPlanPdfFromApi(client.id, client.name);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible generar el PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-sky-900/40 bg-sky-950/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="rounded-xl bg-sky-500/10 p-2.5 text-sky-300"><BarChart3 className="h-5 w-5" /></span>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">Auditoría de prescripción</span>
            <h3 className="mt-1 text-sm font-black text-white">Volumen semanal y entrega</h3>
            <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-neutral-400">
              Pantalla de control para el coach. El conteo es una estimación de series prescritas por grupo muscular; sirve para detectar extremos, no reemplaza el juicio profesional ni contabiliza automáticamente la contribución fraccional de ejercicios compuestos.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => void download()} disabled={downloading || !routine} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar plan PDF
        </button>
      </div>

      {routine && volume.length ? (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {volume.map(item => (
              <div key={item.muscle} className={`rounded-xl border p-2.5 ${item.classification === 'target' ? 'border-emerald-900/50 bg-emerald-950/15' : item.classification === 'high' ? 'border-red-900/50 bg-red-950/15' : 'border-amber-900/50 bg-amber-950/15'}`}>
                <span className="flex items-center justify-between gap-2 text-[9px] font-black uppercase text-neutral-500">
                  {item.muscle}
                  {item.classification === 'target' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                </span>
                <strong className="mt-1 block text-sm text-white">{item.sets} series</strong>
                <span className="text-[9px] text-neutral-500">{item.exerciseCount} ejercicios</span>
              </div>
            ))}
          </div>
          {alerts.length > 0 && <p className="mt-3 rounded-xl border border-neutral-800 bg-black/30 p-2.5 text-[10px] leading-relaxed text-neutral-400">Revisa los grupos marcados antes de publicar. Los umbrales son una señal de auditoría general y deben interpretarse según nivel, frecuencia, objetivo, proximidad al fallo, recuperación y volumen previo del cliente.</p>}
        </>
      ) : <p className="mt-4 rounded-xl border border-neutral-800 bg-black/30 p-3 text-xs text-neutral-400">Carga o genera una rutina para visualizar el control de volumen y habilitar el PDF.</p>}

      {message && <p className="mt-3 text-[11px] text-amber-300">{message}</p>}
    </section>
  );
};
