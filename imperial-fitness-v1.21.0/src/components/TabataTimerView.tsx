import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward, Timer, Volume2, VolumeX } from 'lucide-react';
import { ClientProfile } from '../data/mockData';

interface Props {
  currentUser: ClientProfile;
  onUpdateTokens?: (tokens: number) => void;
}

type Phase = 'prepare' | 'work' | 'rest' | 'done';

const phaseStyles: Record<Phase, { label: string; badge: string; time: string; panel: string; progress: string; helper: string }> = {
  prepare: {
    label: 'Preparación',
    badge: 'bg-amber-500 text-black border-amber-300',
    time: 'text-amber-200',
    panel: 'border-amber-900/50 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_38%),#080808]',
    progress: 'bg-amber-400',
    helper: 'Alístate para iniciar el bloque.',
  },
  work: {
    label: 'ENTRENO',
    badge: 'bg-red-600 text-white border-red-400',
    time: 'text-red-100 drop-shadow-[0_0_35px_rgba(239,68,68,0.42)]',
    panel: 'border-red-700/70 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.28),transparent_42%),#080808]',
    progress: 'bg-red-500',
    helper: 'Máxima concentración: ejecuta el ejercicio.',
  },
  rest: {
    label: 'DESCANSO',
    badge: 'bg-emerald-500 text-black border-emerald-300',
    time: 'text-emerald-100 drop-shadow-[0_0_35px_rgba(52,211,153,0.35)]',
    panel: 'border-emerald-700/60 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.24),transparent_42%),#080808]',
    progress: 'bg-emerald-400',
    helper: 'Respira, recupera y prepárate para la siguiente ronda.',
  },
  done: {
    label: 'Completado',
    badge: 'bg-white text-black border-white',
    time: 'text-white',
    panel: 'border-white/20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_40%),#080808]',
    progress: 'bg-white',
    helper: 'Trabajo terminado. Registra tu progreso.',
  },
};

export const TabataTimerView: React.FC<Props> = ({ currentUser, onUpdateTokens }) => {
  const [prepare, setPrepare] = useState(10);
  const [work, setWork] = useState(40);
  const [rest, setRest] = useState(20);
  const [rounds, setRounds] = useState(8);
  const [phase, setPhase] = useState<Phase>('prepare');
  const [round, setRound] = useState(1);
  const [remaining, setRemaining] = useState(prepare);
  const [running, setRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const awardedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const unlockAudio = useCallback(async () => {
    if (!soundEnabled) return;
    const AudioContextCtor = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!audioContextRef.current) audioContextRef.current = new AudioContextCtor();
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
  }, [soundEnabled]);

  const playCountdownTone = useCallback((count: number) => {
    if (!soundEnabled) return;
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;
    const baseFrequency = count === 1 ? 980 : count === 2 ? 860 : 740;
    const master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();

    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.82, now + 0.015);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    master.connect(compressor);
    compressor.connect(ctx.destination);

    [0, 7].forEach((detune) => {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(baseFrequency + detune, now);
      oscillator.connect(master);
      oscillator.start(now);
      oscillator.stop(now + 0.34);
    });

    const punch = ctx.createOscillator();
    punch.type = 'sawtooth';
    punch.frequency.setValueAtTime(baseFrequency / 2, now);
    punch.frequency.exponentialRampToValueAtTime(baseFrequency * 0.95, now + 0.08);
    punch.connect(master);
    punch.start(now);
    punch.stop(now + 0.18);
  }, [soundEnabled]);

  const playTone = useCallback((targetPhase: Phase) => {
    if (!soundEnabled || targetPhase === 'prepare') return;
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;
    const tones = targetPhase === 'work'
      ? [
          { frequency: 1046, delay: 0, duration: 0.22 },
          { frequency: 1318, delay: 0.16, duration: 0.24 },
          { frequency: 1568, delay: 0.34, duration: 0.38 },
        ]
      : targetPhase === 'rest'
        ? [
            { frequency: 698, delay: 0, duration: 0.24 },
            { frequency: 523, delay: 0.18, duration: 0.26 },
            { frequency: 392, delay: 0.36, duration: 0.36 },
          ]
        : [
            { frequency: 880, delay: 0, duration: 0.24 },
            { frequency: 1175, delay: 0.16, duration: 0.28 },
            { frequency: 1760, delay: 0.34, duration: 0.48 },
          ];

    tones.forEach(({ frequency, delay, duration }) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = targetPhase === 'rest' ? 'triangle' : 'square';
      oscillator.frequency.setValueAtTime(frequency, now + delay);
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.75, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now + delay);
      oscillator.stop(now + delay + duration + 0.03);
    });
  }, [soundEnabled]);

  useEffect(() => {
    setRemaining(phase === 'prepare' ? prepare : phase === 'work' ? work : phase === 'rest' ? rest : 0);
  }, [prepare, work, rest, phase]);

  const nextPhase = useCallback(() => {
    if (phase === 'prepare') {
      setPhase('work');
      setRemaining(work);
      playTone('work');
      return;
    }
    if (phase === 'work') {
      if (round >= rounds) {
        setPhase('done');
        setRemaining(0);
        setRunning(false);
        playTone('done');
        if (!awardedRef.current && currentUser.role === 'client' && onUpdateTokens) {
          awardedRef.current = true;
          onUpdateTokens((currentUser.tokens || 0) + 25);
        }
      } else {
        setPhase('rest');
        setRemaining(rest);
        playTone('rest');
      }
      return;
    }
    if (phase === 'rest') {
      setRound(prev => prev + 1);
      setPhase('work');
      setRemaining(work);
      playTone('work');
    }
  }, [currentUser.role, currentUser.tokens, onUpdateTokens, phase, playTone, rest, round, rounds, work]);

  useEffect(() => {
    if (!running || phase === 'done') return;
    const id = window.setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          window.setTimeout(nextPhase, 0);
          return 0;
        }
        const nextRemaining = prev - 1;
        if (nextRemaining <= 3 && nextRemaining >= 1) {
          playCountdownTone(nextRemaining);
        }
        return nextRemaining;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, phase, nextPhase, playCountdownTone]);

  const toggleRunning = async () => {
    if (!running) await unlockAudio();
    setRunning(value => !value);
  };

  const skip = async () => {
    await unlockAudio();
    nextPhase();
  };

  const reset = () => {
    setRunning(false);
    setPhase('prepare');
    setRound(1);
    setRemaining(prepare);
    awardedRef.current = false;
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const progress = phase === 'prepare' ? ((prepare - remaining) / Math.max(prepare, 1)) : phase === 'work' ? ((work - remaining) / Math.max(work, 1)) : phase === 'rest' ? ((rest - remaining) / Math.max(rest, 1)) : 1;
  const visual = phaseStyles[phase];
  const isCountdown = running && phase !== 'done' && remaining <= 3 && remaining > 0;

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-8 space-y-6">
      <div className={`rounded-[2rem] border p-4 sm:p-6 text-center shadow-2xl transition-all ${visual.panel}`}>
        <div className="flex items-center justify-center gap-2 text-red-400 text-[11px] sm:text-xs uppercase tracking-[0.22em] sm:tracking-[0.3em] font-black mb-4">
          <Timer className="w-5 h-5" /> Timer Imperial Tabata
        </div>

        <div className={`mx-auto inline-flex items-center justify-center rounded-full border px-5 py-2 text-xl sm:text-3xl md:text-4xl font-black uppercase tracking-wider ${visual.badge}`}>
          {visual.label}
        </div>
        <p className="mt-3 text-xs sm:text-sm text-neutral-400 font-semibold">{visual.helper}</p>

        <div className={`mt-5 text-[clamp(4.2rem,24vw,8rem)] leading-none font-black font-mono tracking-tighter ${visual.time} ${isCountdown ? 'animate-pulse scale-105' : ''}`}>{mm}:{ss}</div>

        {isCountdown && (
          <div className="mt-3 mx-auto w-full max-w-md rounded-3xl border-2 border-yellow-300 bg-yellow-400 text-black px-5 py-4 shadow-[0_0_45px_rgba(250,204,21,0.55)] animate-pulse">
            <p className="text-[11px] uppercase tracking-[0.35em] font-black">Cambio en</p>
            <p className="text-6xl sm:text-7xl font-black leading-none">{remaining}</p>
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
          <span className="px-4 py-2 rounded-full bg-neutral-900 text-neutral-200 text-sm font-black uppercase border border-neutral-800">Ronda {round}/{rounds}</span>
          <button
            type="button"
            onClick={() => setSoundEnabled(v => !v)}
            className="px-4 py-2 rounded-full bg-neutral-900 text-neutral-300 text-xs font-bold border border-neutral-800 flex items-center gap-2"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-yellow-300" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
            {soundEnabled ? 'Sonido fuerte activo' : 'Sin sonido'}
          </button>
        </div>

        <div className="h-3 bg-neutral-900 rounded-full overflow-hidden mt-6 border border-neutral-800">
          <div className={`h-full transition-all ${visual.progress}`} style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <button onClick={toggleRunning} className="bg-red-600 hover:bg-red-500 text-white rounded-2xl px-6 py-4 font-black flex items-center justify-center gap-2 text-sm sm:text-base">
            {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />} {running ? 'Pausar' : 'Iniciar'}
          </button>
          <button onClick={skip} className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl px-5 py-4 font-bold flex items-center justify-center gap-2 text-sm sm:text-base border border-neutral-800"><SkipForward className="w-5 h-5" /> Saltar</button>
          <button onClick={reset} className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl px-5 py-4 font-bold flex items-center justify-center gap-2 text-sm sm:text-base border border-neutral-800"><RotateCcw className="w-5 h-5" /> Reiniciar</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Preparación', prepare, setPrepare],
          ['Entreno', work, setWork],
          ['Descanso', rest, setRest],
          ['Rondas', rounds, setRounds],
        ].map(([label, value, setter]) => (
          <label key={String(label)} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-2">{String(label)}</span>
            <input type="number" min={label === 'Rondas' ? 1 : 0} value={Number(value)} onChange={(e) => (setter as React.Dispatch<React.SetStateAction<number>>)(Math.max(label === 'Rondas' ? 1 : 0, Number(e.target.value) || 0))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-white font-bold" />
          </label>
        ))}
      </div>
    </div>
  );
};
