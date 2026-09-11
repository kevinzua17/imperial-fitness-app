import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Copy, KeyRound, MessageCircle, RefreshCcw, Search, ShieldCheck, XCircle } from 'lucide-react';
import {
  generateTemporaryPasswordFromApi,
  listRecoveryRequestsFromApi,
  RecoveryRequestItem,
  RecoveryRequestStatus,
  rejectRecoveryRequestFromApi,
} from '../services/recoveryService';

const statusLabel: Record<RecoveryRequestStatus, string> = {
  pending: 'Pendiente',
  resolved: 'Resuelta',
  rejected: 'Rechazada',
};

const normalizePhoneForWhatsapp = (phone?: string | null) => {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export const RecoveryRequestsView: React.FC = () => {
  const [status, setStatus] = useState<RecoveryRequestStatus | 'all'>('pending');
  const [requests, setRequests] = useState<RecoveryRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState<{ email: string; password: string; phone?: string | null } | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await listRecoveryRequestsFromApi(status);
      setRequests(data);
    } catch {
      setMessage('No se pudieron cargar las solicitudes de recuperación. Verifica tu sesión e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [status]);

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return requests;
    return requests.filter((item) => {
      return (
        item.email.toLowerCase().includes(clean) ||
        (item.user_name || '').toLowerCase().includes(clean) ||
        (item.phone_number || '').toLowerCase().includes(clean)
      );
    });
  }, [requests, query]);

  const pendingCount = requests.filter((item) => item.status === 'pending').length;

  const handleGeneratePassword = async (request: RecoveryRequestItem) => {
    if (!request.known_user || !request.user_id) {
      setMessage('Este correo no pertenece a un usuario registrado. No se puede generar clave temporal.');
      return;
    }

    setProcessingId(request.id);
    setMessage('');
    try {
      const response = await generateTemporaryPasswordFromApi(
        request.id,
        'Clave temporal generada desde Recuperación de cuentas.',
      );
      setGeneratedPassword({ email: request.email, password: response.temporary_password, phone: request.phone_number });
      await loadRequests();
    } catch {
      setMessage('No se pudo generar la clave temporal. Revisa que la solicitud siga pendiente.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: RecoveryRequestItem) => {
    setProcessingId(request.id);
    setMessage('');
    try {
      await rejectRecoveryRequestFromApi(request.id, 'Solicitud rechazada desde Recuperación de cuentas.');
      await loadRequests();
    } catch {
      setMessage('No se pudo rechazar la solicitud.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopyPassword = async () => {
    if (!generatedPassword) return;
    await navigator.clipboard.writeText(generatedPassword.password);
    setMessage('Clave temporal copiada. Envíala solo por un canal seguro.');
  };

  const whatsappUrl = useMemo(() => {
    if (!generatedPassword?.phone) return '';
    const phone = normalizePhoneForWhatsapp(generatedPassword.phone);
    if (!phone) return '';
    const text = encodeURIComponent(
      `Hola, somos Imperial Fitness. Tu acceso fue restablecido. Ingresa con la clave temporal: ${generatedPassword.password}. Al entrar, cambia tu contraseña desde Perfil.`,
    );
    return `https://wa.me/${phone}?text=${text}`;
  }, [generatedPassword]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <section className="rounded-3xl border border-red-900/40 bg-gradient-to-br from-neutral-950 via-neutral-950 to-red-950/20 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-600/30 bg-red-950/30 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-red-200 mb-3">
              <ShieldCheck className="h-3.5 w-3.5" /> Control interno admin
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Recuperación de cuentas</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-400">
              Aquí aparecen los usuarios que solicitaron ayuda para recuperar su acceso. Desde este panel puedes generar una clave temporal y contactar por WhatsApp.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[260px]">
            <div className="rounded-2xl border border-neutral-800 bg-black/40 p-4">
              <p className="text-[11px] uppercase tracking-widest text-neutral-500">Pendientes</p>
              <p className="text-3xl font-black text-red-400">{pendingCount}</p>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-black/40 p-4">
              <p className="text-[11px] uppercase tracking-widest text-neutral-500">Mostradas</p>
              <p className="text-3xl font-black text-white">{filtered.length}</p>
            </div>
          </div>
        </div>
      </section>

      {generatedPassword && (
        <section className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-5 shadow-[0_0_60px_rgba(16,185,129,0.15)]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Clave temporal generada para {generatedPassword.email}
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Compártela solo por canal seguro. El usuario debe cambiarla desde Perfil al ingresar.
              </p>
              <div className="mt-3 inline-flex items-center rounded-xl border border-emerald-500/30 bg-black/40 px-4 py-2 font-mono text-lg font-black text-white">
                {generatedPassword.password}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyPassword}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-black hover:bg-neutral-200"
              >
                <Copy className="h-4 w-4" /> Copiar clave
              </button>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500"
                >
                  <MessageCircle className="h-4 w-4" /> Enviar WhatsApp
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-neutral-900 bg-neutral-950 p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div className="flex flex-wrap gap-2">
            {(['pending', 'resolved', 'rejected', 'all'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(item)}
                className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${
                  status === item
                    ? 'bg-red-600 text-white shadow-[0_0_25px_rgba(220,38,38,0.35)]'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {item === 'all' ? 'Todas' : statusLabel[item]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, correo o teléfono"
                className="w-full md:w-72 rounded-xl border border-neutral-800 bg-black py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-red-600"
              />
            </div>
            <button
              type="button"
              onClick={loadRequests}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-neutral-300 hover:text-white"
              title="Actualizar"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3 text-sm text-amber-200">
            {message}
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((request) => {
            const isPending = request.status === 'pending';
            const phone = normalizePhoneForWhatsapp(request.phone_number);
            const pendingUnknown = isPending && !request.known_user;
            const waMessage = encodeURIComponent(
              'Hola, somos Imperial Fitness. Recibimos tu solicitud de recuperación de acceso. Ya estamos revisando tu cuenta.',
            );
            const waLink = phone ? `https://wa.me/${phone}?text=${waMessage}` : '';

            return (
              <article
                key={request.id}
                className="rounded-2xl border border-neutral-900 bg-black/40 p-4 hover:border-neutral-700 transition"
              >
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                          request.status === 'pending'
                            ? 'bg-red-950/40 text-red-200 border border-red-500/30'
                            : request.status === 'resolved'
                              ? 'bg-emerald-950/40 text-emerald-200 border border-emerald-500/30'
                              : 'bg-neutral-900 text-neutral-300 border border-neutral-700'
                        }`}
                      >
                        {request.status === 'pending' && <Clock3 className="h-3 w-3" />}
                        {request.status === 'resolved' && <CheckCircle2 className="h-3 w-3" />}
                        {request.status === 'rejected' && <XCircle className="h-3 w-3" />}
                        {statusLabel[request.status]}
                      </span>

                      {pendingUnknown && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-950/20 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-200">
                          <AlertTriangle className="h-3 w-3" /> Correo no registrado
                        </span>
                      )}
                    </div>

                    <h2 className="truncate text-lg font-black text-white">
                      {request.user_name || 'Usuario no identificado'}
                    </h2>
                    <p className="text-sm text-neutral-400">{request.email}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Solicitado: {formatDate(request.requested_at)}
                      {request.phone_number ? ` · WhatsApp: ${request.phone_number}` : ' · Sin teléfono registrado'}
                    </p>
                    {request.admin_notes && (
                      <p className="mt-2 text-xs text-neutral-400">Nota: {request.admin_notes}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-900/30"
                      >
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                    )}

                    {isPending && request.known_user && (
                      <button
                        type="button"
                        disabled={processingId === request.id}
                        onClick={() => handleGeneratePassword(request)}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
                      >
                        <KeyRound className="h-4 w-4" /> Generar clave temporal
                      </button>
                    )}

                    {isPending && (
                      <button
                        type="button"
                        disabled={processingId === request.id}
                        onClick={() => handleReject(request)}
                        className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-bold text-neutral-300 hover:text-white disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" /> Rechazar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl border border-neutral-900 bg-black/40 p-8 text-center text-sm text-neutral-500">
              No hay solicitudes para mostrar en este estado.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
