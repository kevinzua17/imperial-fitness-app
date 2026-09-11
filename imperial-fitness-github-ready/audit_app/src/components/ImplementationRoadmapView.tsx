import React from 'react';
import { CheckCircle2, Code2, Database, Globe2, Rocket, Server, Smartphone, Terminal } from 'lucide-react';

const steps = [
  {
    title: 'Fase 1: API Python local',
    icon: Server,
    status: 'Creada en este proyecto',
    description: 'Levantar una API en Python para guardar usuarios, alimentos, dietas, rutinas, fotos y eventos sincronizados.',
    commands: [
      'cd backend',
      'python -m venv .venv',
      '.venv\\Scripts\\activate   # Windows',
      'pip install -r requirements.txt',
      'copy .env.example .env',
      'python -m app.seed',
      'uvicorn app.main:app --reload --host 0.0.0.0 --port 8000'
    ]
  },
  {
    title: 'Fase 2: Conectar la web React con la API',
    icon: Code2,
    status: 'Completada base API',
    description: 'El frontend ya consume la API principal. Esta fase queda como referencia técnica para mantenimiento y despliegue.',
    commands: [
      'GET http://localhost:8000/users',
      'GET http://localhost:8000/nutrition/foods',
      'POST http://localhost:8000/nutrition/equivalence',
      'GET http://localhost:8000/routines/templates'
    ]
  },
  {
    title: 'Fase 3: Base de datos real',
    icon: Database,
    status: 'Después de probar local',
    description: 'Migrar de SQLite local a PostgreSQL para soportar usuarios reales, fotos, pagos, chat y métricas de muchas sedes.',
    commands: [
      'Crear base PostgreSQL',
      'Cambiar DATABASE_URL en .env',
      'Crear migraciones con Alembic',
      'Probar login, dietas y fotos con datos reales'
    ]
  },
  {
    title: 'Fase 4: Tiempo real y notificaciones',
    icon: Terminal,
    status: 'Para conectar entrenador y cliente',
    description: 'Agregar WebSockets o Supabase/Firebase para que mensajes, cambios de dieta y fotos aparezcan al instante.',
    commands: [
      'Canal chat cliente-entrenador',
      'Evento cuando el entrenador ajuste dieta',
      'Evento cuando el cliente suba foto',
      'Notificación push al móvil'
    ]
  },
  {
    title: 'Fase 5: App móvil',
    icon: Smartphone,
    status: 'Cuando la API esté estable',
    description: 'Crear app móvil en React Native o Flutter usando la misma API. El cliente y el entrenador verán la misma información sincronizada.',
    commands: [
      'Login móvil',
      'Plan nutricional',
      'Rutina diaria',
      'Fotos de progreso',
      'Chat y notificaciones'
    ]
  },
  {
    title: 'Fase 6: Publicación web y app',
    icon: Rocket,
    status: 'Producción',
    description: 'Subir frontend, backend y base de datos a servidores reales para que esté disponible desde internet y tiendas móviles.',
    commands: [
      'Frontend: Vercel / Netlify / servidor propio',
      'Backend: Render / Railway / VPS / Docker',
      'DB: Supabase / Neon / PostgreSQL cloud',
      'App: Google Play y App Store'
    ]
  }
];

export const ImplementationRoadmapView: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-900/60 bg-red-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400 mb-3">
          <Globe2 className="w-3.5 h-3.5" /> Plan de construcción real
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          De prototipo a plataforma web y app móvil conectada
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400 leading-relaxed">
          Este es el camino práctico para tener Imperial Fitness corriendo primero en tu ordenador, luego en internet, y finalmente como app móvil para clientes y entrenadores.
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
                {step.commands.map(command => (
                  <div key={command} className="flex items-start gap-2 rounded-lg bg-neutral-900/60 border border-neutral-800/60 px-3 py-2 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <code className="text-neutral-300 font-mono leading-relaxed">{command}</code>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/10 p-5">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Qué hicimos ya en esta fase</h2>
        <p className="text-xs text-neutral-300 leading-relaxed">
          La carpeta <strong>backend</strong> contiene la API Python basada en FastAPI. Para producción, la prioridad es configurar Supabase PostgreSQL, Cloudinary, Render, Vercel y validar el flujo beta extremo a extremo.
        </p>
      </div>
    </div>
  );
};