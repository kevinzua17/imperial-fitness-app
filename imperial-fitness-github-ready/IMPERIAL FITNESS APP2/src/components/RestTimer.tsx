import React, { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, TimerReset } from 'lucide-react';

interface RestTimerProps {
  defaultSeconds?: number;
  compact?: boolean;
}

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export const RestTimer: React.FC<RestTimerProps> = ({ defaultSeconds = 90, compact = false }) => {
  const safeDefault = Math.max(15, Math.min(600, defaultSeconds));
  const [remaining, setRemaining] = useState(safeDefault);
  const [running, setRunning] = useState(false);

  useEffect(() => setRemaining(safeDefault), [safeDefault]);

  useEffect(() => {
    if (!running || remaining <= 0) return undefined;
    const timer = window.setInterval(() => {
      setRemaining(value => {
        if (value <= 1) {
          setRunning(false);
          if ('vibrate' in navigator) navigator.vibrate?.([180, 90, 180]);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, remaining]);

  const progress = useMemo(() => Math.max(0, Math.min(100, ((safeDefault - remaining) / safeDefault) * 100)), [remaining, safeDefault]);

  return (
    <div className={`rounded-2xl border border-neutral-800 bg-black/35 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.18em] text-neutral-500">Descanso</span>
          <div className="mt-1 font-mono text-2xl font-black text-white">{formatTime(remaining)}</div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setRunning(value => !value)} className="rounded-xl bg-red-600 p-2 text-white hover:bg-red-500" aria-label={running ? 'Pausar descanso' : 'Iniciar descanso'}>
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => { setRemaining(safeDefault); setRunning(false); }} className="rounded-xl border border-neutral-700 p-2 text-neutral-300 hover:bg-neutral-900" aria-label="Reiniciar descanso">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-900">
        <div className="h-full bg-red-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
      {remaining === 0 && <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-300"><TimerReset className="h-3.5 w-3.5" /> Listo para la siguiente serie.</p>}
    </div>
  );
};
