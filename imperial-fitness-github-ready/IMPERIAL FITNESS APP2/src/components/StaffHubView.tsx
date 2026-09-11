import type { FC } from 'react';
import {
  Activity,
  Archive,
  BrainCircuit,
  CreditCard,
  DollarSign,
  Dumbbell,
  Globe,
  KeyRound,
  MessageSquare,
  ShieldCheck,
  Timer,
  Trophy,
  Wifi,
  Crown,
  Image,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import type { ClientProfile } from '../data/mockData';

interface StaffHubViewProps {
  currentUser: ClientProfile;
  onNavigateTab: (tab: string) => void;
}

type Tool = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const COACH_TOOLS: Tool[] = [
  { id: 'body_metrics', label: 'Seguimiento', description: 'Medidas, evolución y control corporal.', icon: Activity },
  { id: 'history', label: 'Historial', description: 'Evolución y registros históricos del cliente.', icon: Archive },
  { id: 'photos', label: 'Fotos de progreso', description: 'Comparativas visuales y seguimiento fotográfico.', icon: Image },
  { id: 'exercises', label: 'Biblioteca de ejercicios', description: 'Consulta y administración del catálogo visual.', icon: Dumbbell },
  { id: 'specialist_assistant', label: 'Asistente Coach', description: 'Herramientas de apoyo para planificación profesional.', icon: BrainCircuit },
  { id: 'chat', label: 'Chat', description: 'Comunicación con clientes.', icon: MessageSquare },
  { id: 'challenges', label: 'Reto 8 semanas', description: 'Retos y seguimiento de adherencia.', icon: Trophy },
  { id: 'imperial_path', label: 'Control Imperial', description: 'Gamificación y progreso general.', icon: Crown },
  { id: 'social', label: 'Comunidad', description: 'Actividad social de la comunidad Imperial.', icon: Globe },
  { id: 'timer', label: 'Timer', description: 'Temporizador de apoyo para entrenamiento.', icon: Timer },
];

const ADMIN_TOOLS: Tool[] = [
  { id: 'membership', label: 'Membresías', description: 'Estados, vigencias y control de membresías.', icon: CreditCard, adminOnly: true },
  { id: 'finance', label: 'Financiero', description: 'Seguimiento operativo y financiero.', icon: DollarSign, adminOnly: true },
  { id: 'user_management', label: 'Accesos', description: 'Usuarios, roles y control de acceso.', icon: ShieldCheck, adminOnly: true },
  { id: 'recovery', label: 'Recuperación', description: 'Solicitudes de recuperación de acceso.', icon: KeyRound, adminOnly: true },
  { id: 'sync', label: 'Actividad del sistema', description: 'Sincronización y actividad operativa.', icon: Wifi, adminOnly: true },
];

const ToolCard: FC<{ tool: Tool; onOpen: () => void }> = ({ tool, onOpen }) => {
  const Icon = tool.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4 text-left transition hover:border-red-500/40 hover:bg-neutral-900"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-red-400">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-white">{tool.label}</span>
        <span className="mt-1 block text-[11px] leading-relaxed text-neutral-500">{tool.description}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-neutral-600 transition group-hover:translate-x-0.5 group-hover:text-red-400" />
    </button>
  );
};

export const StaffHubView: FC<StaffHubViewProps> = ({ currentUser, onNavigateTab }) => {
  const isAdmin = currentUser.role === 'admin';
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-950 to-neutral-900 p-5 sm:p-7">
        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-red-400">
          {isAdmin ? 'Centro de gestión' : 'Herramientas coach'}
        </span>
        <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
          Todo lo avanzado, sin llenar el menú principal.
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400">
          Imperial mantiene sus herramientas profesionales, pero ahora las agrupa aquí. Tu navegación principal queda enfocada en clientes, planes y decisiones importantes.
        </p>
      </div>

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-neutral-200">Coaching y seguimiento</h2>
          <p className="mt-1 text-xs text-neutral-500">Herramientas que apoyan el trabajo diario con tus clientes.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {COACH_TOOLS.map(tool => (
            <ToolCard key={tool.id} tool={tool} onOpen={() => onNavigateTab(tool.id)} />
          ))}
        </div>
      </section>

      {isAdmin && (
        <section className="mt-8">
          <div className="mb-3">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-neutral-200">Administración</h2>
            <p className="mt-1 text-xs text-neutral-500">Operación, accesos, membresías y control del sistema.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ADMIN_TOOLS.map(tool => (
              <ToolCard key={tool.id} tool={tool} onOpen={() => onNavigateTab(tool.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
