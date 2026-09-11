import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Cloud,
  Database,
  Image,
  MessageSquare,
  RefreshCw,
  Send,
  Server,
  Smartphone,
  Users,
  Wifi
} from 'lucide-react';
import { ClientProfile, DietPlan, WorkoutRoutine } from '../data/mockData';
import { ApiSyncEvent, createSyncEventInApi, listSyncEventsFromApi, SyncEventType } from '../services/syncService';

interface SyncHubViewProps {
  currentUser: ClientProfile;
  users: ClientProfile[];
  diets: DietPlan[];
  routines: WorkoutRoutine[];
}

interface SyncEvent {
  id: string;
  title: string;
  detail: string;
  source: string;
  target: string;
  time: string;
  type: SyncEventType;
}

const nowLabel = () => new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

const cleanEventText = (value: string) => value
  .replace(/backend|api|servidor|server|base de datos|sql|supabase|render|vercel|cloudinary/gi, 'sistema')
  .replace(/frontend/gi, 'pantalla')
  .replace(/\s+/g, ' ')
  .trim();

const mapApiEvent = (event: ApiSyncEvent): SyncEvent => ({
  id: String(event.id),
  title: cleanEventText(event.title),
  detail: cleanEventText(event.detail),
  source: cleanEventText(event.source),
  target: cleanEventText(event.target),
  time: new Date(event.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
  type: ['plan', 'photo', 'chat', 'checkin', 'system'].includes(event.event_type) ? event.event_type as SyncEventType : 'system',
});

export const SyncHubView: React.FC<SyncHubViewProps> = ({ currentUser, users, diets, routines }) => {
  const mainClient = users.find(u => u.role === 'client') || currentUser;
  const trainer = users.find(u => u.role === 'trainer');
  const admin = users.find(u => u.role === 'admin');

  const fallbackEvents: SyncEvent[] = [
    {
      id: 'evt-1',
      title: 'Plan nutricional disponible',
      detail: `${trainer?.name || 'Entrenador'} publicó el plan activo de ${mainClient.name}.`,
      source: 'Panel Entrenador',
      target: 'Vista Cliente',
      time: '08:15 AM',
      type: 'plan'
    },
    {
      id: 'evt-2',
      title: 'Check-in de entrenamiento registrado',
      detail: `${mainClient.name} confirmó asistencia y sumó recompensas.`,
      source: 'Vista Cliente',
      target: 'Panel Administrativo',
      time: '09:42 AM',
      type: 'checkin'
    },
    {
      id: 'evt-3',
      title: 'Mensaje privado entregado',
      detail: `Canal directo entre ${mainClient.name} y ${trainer?.name || 'su entrenadora'} sincronizado.`,
      source: 'Chat Privado',
      target: 'Ambos dispositivos',
      time: '10:10 AM',
      type: 'chat'
    }
  ];

  const [events, setEvents] = useState<SyncEvent[]>(fallbackEvents);
  const [syncMessage, setSyncMessage] = useState('Actualizando actividad del equipo...');

  const syncedStats = useMemo(() => {
    const clients = users.filter(u => u.role === 'client').length;
    const photos = users.reduce((acc, u) => acc + (u.progressPhotos?.length || 0), 0);
    return {
      clients,
      trainers: users.filter(u => u.role === 'trainer').length,
      diets: diets.length,
      routines: routines.length,
      photos,
      connected: users.length + 3
    };
  }, [users, diets, routines]);

  useEffect(() => {
    listSyncEventsFromApi()
      .then(apiEvents => {
        if (apiEvents.length > 0) {
          setEvents(apiEvents.map(mapApiEvent));
          setSyncMessage('Actividad actualizada correctamente.');
        } else {
          setSyncMessage('Sin actividad registrada todavía. Las próximas acciones aparecerán aquí.');
        }
      })
      .catch(() => setSyncMessage('No se pudo actualizar la actividad. Se mantiene la última vista disponible.'));
  }, []);

  const pushEvent = async (event: Omit<SyncEvent, 'id' | 'time'>) => {
    const optimisticEvent = {
      ...event,
      id: `evt-${Date.now()}`,
      time: nowLabel()
    };
    setEvents(prev => [optimisticEvent, ...prev]);
    try {
      const saved = await createSyncEventInApi({
        title: event.title,
        detail: event.detail,
        source: event.source,
        target: event.target,
        event_type: event.type,
      });
      setEvents(prev => [mapApiEvent(saved), ...prev.filter(item => item.id !== optimisticEvent.id)]);
      setSyncMessage('Actividad registrada y visible para el equipo.');
    } catch {
      setSyncMessage('Actividad mostrada en pantalla, pero no se confirmó el guardado.');
    }
  };

  const eventStyles = {
    plan: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    photo: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    chat: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    checkin: 'text-red-400 bg-red-500/10 border-red-500/20',
    system: 'text-neutral-300 bg-neutral-800/60 border-neutral-700'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 p-6">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-red-950/25 to-transparent pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-900/60 bg-red-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400 mb-3">
              <Wifi className="w-3.5 h-3.5" /> Centro de Actividad
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Actividad conectada entre cliente, entrenador y administración
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-400 font-light leading-relaxed">
              Aquí puedes revisar cómo se mueven las acciones importantes: planes, fotos, mensajes, asistencias, recompensas y seguimiento del cliente.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 min-w-full lg:min-w-[390px]">
            <div className="rounded-xl border border-neutral-800 bg-black/40 p-3 text-center">
              <span className="text-[10px] text-neutral-500 uppercase block">Usuarios</span>
              <strong className="text-xl text-white font-mono">{syncedStats.clients}</strong>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-black/40 p-3 text-center">
              <span className="text-[10px] text-neutral-500 uppercase block">Dietas</span>
              <strong className="text-xl text-white font-mono">{syncedStats.diets}</strong>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-black/40 p-3 text-center">
              <span className="text-[10px] text-neutral-500 uppercase block">Conectados</span>
              <strong className="text-xl text-emerald-400 font-mono">{syncedStats.connected}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Panel Administrativo',
                subtitle: admin?.name || 'Administrador',
                icon: Server,
                detail: 'Métricas, finanzas, clientes, entrenadores y configuración del gimnasio.'
              },
              {
                title: 'Vista Entrenador',
                subtitle: trainer?.name || 'Entrenador asignado',
                icon: Users,
                detail: 'Prescribe dietas, rutinas, revisa fotos, responde chat y controla progreso.'
              },
              {
                title: 'Vista Cliente',
                subtitle: mainClient.name,
                icon: Smartphone,
                detail: 'Ve su plan, sube fotos, registra medidas, escribe al coach y gana recompensas.'
              }
            ].map((node) => {
              const Icon = node.icon;
              return (
                <div key={node.title} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 min-h-[190px] flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-900/50 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-red-500" />
                    </div>
                    <h3 className="text-sm font-bold text-white">{node.title}</h3>
                    <span className="text-[11px] text-emerald-400 font-medium block mt-0.5">{node.subtitle}</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-4 leading-relaxed">{node.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Acciones recientes</h2>
                <p className="text-xs text-neutral-400 mt-1">Registra acciones clave y muestra el estado más reciente para el equipo.</p>
                <p className="text-[11px] text-emerald-400 mt-1">{syncMessage}</p>
              </div>
              <RefreshCw className="w-5 h-5 text-neutral-600" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => pushEvent({
                  title: 'Ajuste de dieta publicado',
                  detail: `${trainer?.name || 'Entrenador'} ajustó porciones de papa, pollo y vegetales para ${mainClient.name}.`,
                  source: 'Vista Entrenador',
                  target: 'Vista Cliente',
                  type: 'plan'
                })}
                className="rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-4 text-left hover:bg-emerald-950/20 transition-colors"
              >
                <Send className="w-4 h-4 text-emerald-400 mb-2" />
                <span className="text-xs font-bold text-white block">Publicar ajuste de dieta</span>
                <span className="text-[11px] text-neutral-400 block mt-1">El cliente recibe el cambio al instante.</span>
              </button>

              <button
                onClick={() => pushEvent({
                  title: 'Foto de progreso cargada',
                  detail: `${mainClient.name} subió una nueva foto de frente para revisión de ${trainer?.name || 'su coach'}.`,
                  source: 'Vista Cliente',
                  target: 'Vista Entrenador',
                  type: 'photo'
                })}
                className="rounded-xl border border-sky-900/40 bg-sky-950/10 p-4 text-left hover:bg-sky-950/20 transition-colors"
              >
                <Image className="w-4 h-4 text-sky-400 mb-2" />
                <span className="text-xs font-bold text-white block">Subir foto de progreso</span>
                <span className="text-[11px] text-neutral-400 block mt-1">El entrenador ve la comparación visual.</span>
              </button>

              <button
                onClick={() => pushEvent({
                  title: 'Mensaje privado enviado',
                  detail: `${mainClient.name} escribió una consulta sobre sustitución de alimentos.`,
                  source: 'Chat Cliente',
                  target: 'Chat Entrenador',
                  type: 'chat'
                })}
                className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-4 text-left hover:bg-amber-950/20 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-amber-400 mb-2" />
                <span className="text-xs font-bold text-white block">Enviar mensaje al coach</span>
                <span className="text-[11px] text-neutral-400 block mt-1">Se sincroniza en ambos dispositivos.</span>
              </button>

              <button
                onClick={() => pushEvent({
                  title: 'Asistencia registrada',
                  detail: `${mainClient.name} hizo check-in en sede y el dashboard actualizó racha y recompensas.`,
                  source: 'Vista Cliente',
                  target: 'Panel Administrativo',
                  type: 'checkin'
                })}
                className="rounded-xl border border-red-900/40 bg-red-950/10 p-4 text-left hover:bg-red-950/20 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-red-400 mb-2" />
                <span className="text-xs font-bold text-white block">Registrar asistencia</span>
                <span className="text-[11px] text-neutral-400 block mt-1">Actualiza rachas, métricas y tokens.</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Eventos en tiempo real</h2>
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {events.map(event => (
                <div key={event.id} className={`rounded-xl border p-3 ${eventStyles[event.type]}`}>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-white block">{event.title}</span>
                    <span className="text-[9px] text-neutral-400 font-mono shrink-0">{event.time}</span>
                  </div>
                  <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed">{event.detail}</p>
                  <div className="mt-2 flex items-center justify-between text-[9px] text-neutral-500">
                    <span>{event.source}</span>
                    <span>→</span>
                    <span>{event.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Control recomendado para operación</h2>
          <div className="space-y-3 text-xs text-neutral-400">
            <div className="flex gap-3 rounded-xl bg-neutral-900/50 p-3 border border-neutral-800/50">
              <Server className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span><strong className="text-white">Acceso seguro:</strong> cada usuario ve únicamente la información que corresponde a su rol.</span>
            </div>
            <div className="flex gap-3 rounded-xl bg-neutral-900/50 p-3 border border-neutral-800/50">
              <Database className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong className="text-white">Historial protegido:</strong> registros de progreso, pagos, rutinas y planes quedan ordenados para consulta posterior.</span>
            </div>
            <div className="flex gap-3 rounded-xl bg-neutral-900/50 p-3 border border-neutral-800/50">
              <Cloud className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <span><strong className="text-white">Evidencias de progreso:</strong> fotos y documentos deben cargarse con claridad, fecha y responsable del seguimiento.</span>
            </div>
            <div className="flex gap-3 rounded-xl bg-neutral-900/50 p-3 border border-neutral-800/50">
              <Wifi className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span><strong className="text-white">Actualización rápida:</strong> cambios de plan, mensajes y asistencias deben reflejarse sin confundir al usuario.</span>
            </div>
            <div className="flex gap-3 rounded-xl bg-neutral-900/50 p-3 border border-neutral-800/50">
              <Bell className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span><strong className="text-white">Alertas útiles:</strong> avisos de pago, retos, hábitos y seguimiento deben llegar con lenguaje claro.</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Información clave del seguimiento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              'Perfil, rol y plan activo',
              'Dieta, porciones y sustituciones',
              'Rutina, cargas y asistencia',
              'Fotos de progreso y mediciones',
              'Chat cliente-entrenador',
              'Recompensas y retos',
              'Pagos, renovaciones y membresías',
              'Alertas de seguimiento y retención'
            ].map(item => (
              <div key={item} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-neutral-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};