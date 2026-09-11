import React from 'react';
import { CheckCircle2, Globe2, Rocket, ShieldCheck, Smartphone, Users } from 'lucide-react';

const steps = [
  {
    title: 'Fase 1: Experiencia del cliente',
    icon: Smartphone,
    status: 'Prioridad alta',
    description: 'Validar que el cliente pueda entrar, ver su plan, registrar progreso, revisar recompensas y usar la app sin mensajes confusos.',
    tasks: [
      'Inicio de sesión claro y estable',
      'Menú simple para cliente',
      'Plan, medidas, fotos, retos y recompensas visibles',
      'Mensajes de ayuda sin lenguaje técnico',
    ],
  },
  {
    title: 'Fase 2: Operación del entrenador',
    icon: Users,
    status: 'Prioridad alta',
    description: 'Revisar que el entrenador pueda asignar planes, rutinas, cambios y observaciones sin duplicar trabajo manual.',
    tasks: [
      'Crear y actualizar planes rápidamente',
      'Consultar historial por fechas',
      'Revisar limitaciones antes de asignar rutina',
      'Usar mensajes claros para seguimiento',
    ],
  },
  {
    title: 'Fase 3: Administración y control',
    icon: ShieldCheck,
    status: 'Prioridad alta',
    description: 'Asegurar que administración tenga control de usuarios, membresías, pagos, recompensas y actividad del gimnasio.',
    tasks: [
      'Aprobar o suspender usuarios',
      'Validar pagos y membresías',
      'Consultar actividad por periodos',
      'Controlar recompensas y canjes',
    ],
  },
  {
    title: 'Fase 4: Piloto controlado',
    icon: Rocket,
    status: 'Antes de lanzamiento',
    description: 'Probar la app con un grupo pequeño de usuarios reales antes de abrirla a todo el gimnasio.',
    tasks: [
      '30 a 50 usuarios de prueba',
      'Revisión diaria de errores y dudas',
      'Corrección de textos confusos',
      'Medición de uso, asistencia y retención',
    ],
  },
];

export const ImplementationRoadmapView: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-900/60 bg-red-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400 mb-3">
          <Globe2 className="w-3.5 h-3.5" /> Ruta de lanzamiento
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          Preparación para piloto controlado
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400 leading-relaxed">
          Esta sección resume lo que debe quedar validado antes de entregar la app a clientes reales: experiencia clara, operación rápida, control administrativo y seguimiento por periodos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-900/60 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-neutral-500 font-mono">Paso {index + 1}</span>
                    <span className="text-[10px] rounded-full border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-neutral-400">
                      {step.status}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-white mt-1">{step.title}</h2>
                  <p className="text-xs text-neutral-400 leading-relaxed mt-1">{step.description}</p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                {step.tasks.map(task => (
                  <div key={task} className="flex items-start gap-2 rounded-lg bg-neutral-900/60 border border-neutral-800/60 px-3 py-2 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-neutral-300 leading-relaxed">{task}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/10 p-5">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Criterio de salida</h2>
        <p className="text-xs text-neutral-300 leading-relaxed">
          La app debe pasar pruebas reales de ingreso, registro de progreso, filtros por fechas, planes, fotos, pagos, recompensas y mensajes antes de abrirse a todos los clientes del gimnasio.
        </p>
      </div>
    </div>
  );
};
