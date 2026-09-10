import React, { useState } from 'react';
import {
  Award,
  ChevronDown,
  ChevronUp,
  Coins,
  Flame,
  Gem,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from 'lucide-react';

type GuideAudience = 'client' | 'admin';

interface GamificationGuideProps {
  audience?: GuideAudience;
  compact?: boolean;
  userName?: string;
}

const imperialLevels = [
  {
    level: 1,
    title: 'Recluta',
    message: 'Todo proceso fuerte empieza con una decisión.',
    unlock: 'Inicio del Camino Imperial y primeras misiones.',
  },
  {
    level: 5,
    title: 'Discípulo',
    message: 'La constancia empieza a notarse.',
    unlock: 'Insignia inicial y reconocimiento de disciplina.',
  },
  {
    level: 10,
    title: 'Guerrero',
    message: 'El hábito empieza a ganar terreno.',
    unlock: 'Retos especiales y mayor estatus dentro del ranking.',
  },
  {
    level: 15,
    title: 'Gladiador',
    message: 'La disciplina ya hace parte del carácter.',
    unlock: 'Insignias avanzadas y misiones de mayor exigencia.',
  },
  {
    level: 20,
    title: 'Elite Imperial',
    message: 'El proceso se vuelve referencia para otros.',
    unlock: 'Reconocimientos internos y posibles beneficios definidos por el gym.',
  },
  {
    level: 30,
    title: 'Leyenda Imperial',
    message: 'La constancia inspira dentro de la comunidad.',
    unlock: 'Estatus destacado en comunidad y retos de alto nivel.',
  },
  {
    level: 50,
    title: 'Inmortal',
    message: 'Construido por disciplina, paciencia y repetición.',
    unlock: 'Prestigio Imperial y reconocimiento máximo del sistema.',
  },
];

const clientStreaks = [
  { title: 'Racha de entrenamiento', description: 'Suma días cuando se registra entrenamiento o check-in de actividad.' },
  { title: 'Racha nutricional', description: 'Suma días cuando se registra cumplimiento del plan de alimentación.' },
  { title: 'Racha de agua', description: 'Suma días cuando se confirma la hidratación diaria.' },
  { title: 'Racha de sueño', description: 'Suma días cuando se registra una buena recuperación.' },
  { title: 'Racha de progreso', description: 'Suma cuando se registra avance, medidas, peso o foto de progreso.' },
  { title: 'Día Perfecto Imperial', description: 'Se logra cuando entrenamiento, alimentación, agua y recuperación quedan completos.' },
];

const adminRules = [
  { title: 'Entrenamiento', description: 'Ayuda a detectar clientes activos, irregulares o en riesgo de abandono.' },
  { title: 'Nutrición', description: 'Permite identificar baja adherencia sin depender de revisiones manuales extensas.' },
  { title: 'Rachas', description: 'Sirven como indicador de constancia y alerta temprana cuando un usuario se desconecta.' },
  { title: 'Monedas', description: 'Funcionan como saldo interno de reconocimiento. Los canjes se activan solo cuando administración los defina.' },
];

function SectionTitle({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <div className="w-9 h-9 rounded-xl bg-red-950/60 border border-red-900/50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-black text-white">{title}</h3>
        <p className="text-[11px] text-neutral-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export const GamificationGuide: React.FC<GamificationGuideProps> = ({ audience = 'client', compact = false, userName }) => {
  const [open, setOpen] = useState(!compact);
  const isAdmin = audience === 'admin';
  const displayName = userName?.trim() || 'cada socio';

  return (
    <div className="bg-neutral-950/80 border border-red-900/30 rounded-2xl overflow-hidden shadow-xl">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left bg-gradient-to-r from-red-950/50 via-neutral-950 to-neutral-950 hover:from-red-900/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center shadow-[0_0_35px_rgba(220,38,38,0.2)]">
            <Trophy className="w-5 h-5 text-yellow-300" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.25em] text-red-400 font-bold">
              {isAdmin ? 'Guía interna' : 'Camino Imperial'}
            </p>
            <h2 className="text-base md:text-lg font-black text-white truncate">
              {isAdmin ? 'Reglas de seguimiento y reconocimiento' : 'Rangos, rachas y recompensas de progreso'}
            </h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {isAdmin
                ? 'Referencia operativa para interpretar constancia, alertas, monedas y niveles sin prometer beneficios no definidos.'
                : `${displayName} avanza acumulando disciplina, misiones, rachas e insignias dentro de Imperial Fitness.`}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-neutral-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-neutral-400 shrink-0" />}
      </button>

      {open && (
        <div className="p-4 md:p-5 space-y-5">
          {isAdmin ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4">
                <SectionTitle
                  icon={<Zap className="w-4 h-4 text-yellow-300" />}
                  title="Uso interno del sistema"
                  description="La información sensible se usa para seguimiento, no para mostrarle presión comercial directa al usuario."
                />
                <div className="space-y-2">
                  {adminRules.map((rule) => (
                    <div key={rule.title} className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3">
                      <p className="text-xs font-bold text-white">{rule.title}</p>
                      <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">{rule.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4">
                <SectionTitle
                  icon={<Coins className="w-4 h-4 text-yellow-300" />}
                  title="Monedas Imperiales"
                  description="No equivalen automáticamente a premios. Son un saldo interno que puede habilitar canjes cuando administración lo decida."
                />
                <div className="space-y-3">
                  <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3">
                    <p className="text-xs font-bold text-white">Estado actual</p>
                    <p className="text-[10px] text-neutral-500 mt-1">Acumulan historial de participación, retos y constancia.</p>
                  </div>
                  <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3">
                    <p className="text-xs font-bold text-white">Canjes</p>
                    <p className="text-[10px] text-neutral-500 mt-1">El admin define después qué se puede redimir, cuánto cuesta y cuándo se descuenta.</p>
                  </div>
                  <div className="bg-red-950/30 border border-red-800/40 rounded-lg p-3">
                    <p className="text-xs font-bold text-red-200">Regla recomendada</p>
                    <p className="text-[10px] text-red-100/70 mt-1">No prometer premios hasta crear un catálogo oficial de redención.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4">
                <SectionTitle
                  icon={<Flame className="w-4 h-4 text-orange-400" />}
                  title="Rachas"
                  description="Cada registro positivo fortalece la continuidad del proceso y mantiene visible el avance."
                />
                <div className="space-y-2">
                  {clientStreaks.map((item) => (
                    <div key={item.title} className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3">
                      <p className="text-xs font-bold text-white">{item.title}</p>
                      <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4">
                <SectionTitle
                  icon={<Star className="w-4 h-4 text-yellow-300" />}
                  title="XP y rangos"
                  description="El XP permite que el esfuerzo diario se convierta en rango, insignias y reconocimiento dentro del Camino Imperial."
                />
                <div className="space-y-2">
                  <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3">
                    <p className="text-xs font-bold text-white">Cómo se gana XP</p>
                    <p className="text-[10px] text-neutral-500 mt-1">Entrenando, cumpliendo alimentación, registrando agua, sueño, progreso y misiones.</p>
                  </div>
                  <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3">
                    <p className="text-xs font-bold text-white">Qué representa</p>
                    <p className="text-[10px] text-neutral-500 mt-1">Representa constancia acumulada, no dinero ni promesas automáticas de premios.</p>
                  </div>
                  <div className="bg-yellow-950/20 border border-yellow-800/30 rounded-lg p-3">
                    <p className="text-xs font-bold text-yellow-200">Meta</p>
                    <p className="text-[10px] text-yellow-100/70 mt-1">Subir de rango y desbloquear reconocimiento dentro del ecosistema Imperial.</p>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4">
                <SectionTitle
                  icon={<Shield className="w-4 h-4 text-sky-300" />}
                  title="Escudos Imperiales"
                  description="Un escudo ayuda a conservar una racha cuando aparece un día difícil dentro del proceso."
                />
                <div className="space-y-3">
                  <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3">
                    <p className="text-xs font-bold text-white">Cómo se obtiene</p>
                    <p className="text-[10px] text-neutral-500 mt-1">Al lograr una secuencia fuerte de días perfectos.</p>
                  </div>
                  <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3">
                    <p className="text-xs font-bold text-white">Para qué sirve</p>
                    <p className="text-[10px] text-neutral-500 mt-1">Protege el avance en momentos puntuales y mantiene vivo el Camino Imperial.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4">
            <SectionTitle
              icon={<Award className="w-4 h-4 text-yellow-400" />}
              title="Camino de rangos"
              description="Los rangos convierten el avance en identidad dentro del ecosistema Imperial."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
              {imperialLevels.map((level) => (
                <div key={level.level} className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase text-neutral-500 font-bold">Nivel {level.level}</p>
                    <Gem className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <p className="text-sm font-black text-white mt-1">{level.title}</p>
                  <p className="text-[10px] text-neutral-400 mt-1 italic">“{level.message}”</p>
                  <p className="text-[10px] text-yellow-300/80 mt-2">Desbloquea: {level.unlock}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4">
              <SectionTitle
                icon={<Coins className="w-4 h-4 text-yellow-300" />}
                title="Monedas Imperiales"
                description="Son puntos internos de participación. Los canjes se mostrarán solo cuando el gym active un catálogo oficial."
              />
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Las monedas ayudan a reconocer constancia, retos y participación. No representan dinero, descuento automático ni beneficio garantizado.
              </p>
            </div>

            <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4">
              <SectionTitle
                icon={<Sparkles className="w-4 h-4 text-red-300" />}
                title="Prestigio Imperial"
                description="Cuando el camino avance lo suficiente, el sistema podrá habilitar rangos de prestigio para sostener el progreso por más tiempo."
              />
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Prestigio I, II y III se pueden activar como reconocimiento avanzado cuando el gym decida abrir esa etapa.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
