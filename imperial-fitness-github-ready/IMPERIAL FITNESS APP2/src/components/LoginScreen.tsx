import React, { useEffect, useState } from 'react';
import { User, Lock, Key, Sparkles, LogIn, UserPlus, ArrowRight, Phone, Eye, EyeOff, Loader2 } from 'lucide-react';
import type { ClientProfile } from '../data/mockData';
import { ImperialLogoMark } from './ImperialLogoMark';
import type { BrandingSettings } from '../services/mediaService';
import { requestPasswordReset, resetPasswordWithToken } from '../services/authService';
import { ApiError } from '../services/api';

type ExperienceLevel = 'Principiante' | 'Intermedio' | 'Avanzado';
type GenderValue = 'M' | 'F';
type LoginView = 'login' | 'register' | 'forgot' | 'reset';

interface LoginScreenProps {
  onLogin: (user: ClientProfile) => void;
  onLoginWithCredentials?: (email: string, password: string) => Promise<void>;
  onRegisterClientWithCredentials?: (payload: {
    name: string;
    email: string;
    phone_number: string;
    whatsapp_opt_in?: number;
    password: string;
    goal?: string;
    weight?: number;
    height?: number;
    age?: number;
    gender?: GenderValue;
  }) => Promise<void>;
  branding?: BrandingSettings | null;
  users: ClientProfile[];
  onRegister: (newUser: ClientProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  onLoginWithCredentials,
  onRegisterClientWithCredentials,
  branding,
  users,
  onRegister,
}) => {
  const [view, setView] = useState<LoginView>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [goal, setGoal] = useState('Hipertrofia y Acondicionamiento Premium');
  const [experience, setExperience] = useState<ExperienceLevel>('Intermedio');
  const [gender, setGender] = useState<GenderValue>('M');
  const [age, setAge] = useState(25);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);

  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [msg, setMsg] = useState('');

  const gymName = branding?.gym_name || 'IMPERIAL FITNESS';
  const [mainName, ...restName] = gymName.split(' ');
  const highlightedName = restName.join(' ') || 'FITNESS';

  const loginBackgroundUrl =
    branding?.login_background_url ||
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1800&auto=format&fit=crop&q=80';

  const logoUrl = branding?.gym_logo_url || '/logo-imperial-fitness.png';

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('reset_token');
    if (token) {
      setResetToken(token);
      setView('reset');
    }
  }, []);

  const handleCustomLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setMsg('Ingresa tu correo y contraseña para continuar.');
      return;
    }

    if (onLoginWithCredentials) {
      setAuthLoading(true);
      try {
        setMsg('Validando tu acceso...');
        await onLoginWithCredentials(cleanEmail, password);
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 401) setMsg('Correo o contraseña incorrectos.');
          else if (error.status === 403) setMsg(error.message || 'La cuenta no está activa.');
          else if (error.status === 429) setMsg('La cuenta está bloqueada temporalmente por varios intentos. Ejecuta la recuperación administrativa o espera el tiempo indicado.');
          else if (error.status === 503) setMsg('El acceso requiere completar la actualización de Supabase. Ejecuta RECUPERAR_ACCESO_ADMIN_v1.19.1.sql y vuelve a intentar.');
          else if (error.status === 0) setMsg('La aplicación no está logrando comunicarse con Render. Revisa VITE_API_BASE_URL y el estado del backend.');
          else setMsg(error.message || 'No se pudo iniciar sesión.');
        } else {
          setMsg('No se pudo iniciar sesión. Revisa la conexión con Render e intenta nuevamente.');
        }
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    const found = users.find((user) => user.email.toLowerCase() === cleanEmail);
    if (found) {
      onLogin(found);
      return;
    }

    setMsg('Usuario no encontrado. Verifica tus datos o solicita acceso como cliente.');
  };

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phoneNumber.trim();

    if (!cleanName || !cleanEmail || !cleanPhone || !password) {
      setMsg('Por favor completa nombre, correo, WhatsApp y contraseña.');
      return;
    }

    if (password.length < 8) {
      setMsg('La contraseña debe tener mínimo 8 caracteres.');
      return;
    }

    if (onRegisterClientWithCredentials) {
      setRegisterLoading(true);
      try {
        const optionalNumber = (value: number, min: number, max: number) => {
          if (!Number.isFinite(value) || value < min || value > max) return undefined;
          return value;
        };

        await onRegisterClientWithCredentials({
          name: cleanName,
          email: cleanEmail,
          phone_number: cleanPhone,
          whatsapp_opt_in: whatsappOptIn ? 1 : 0,
          password,
          goal: goal.trim() || undefined,
          weight: optionalNumber(weight, 20, 300),
          height: optionalNumber(height, 120, 250),
          age: optionalNumber(age, 10, 100),
          gender,
        });
        setMsg('Solicitud enviada. Tu cuenta queda pendiente de aprobación por el equipo Imperial.');
        setTimeout(() => setView('login'), 2500);
      } catch (error) {
        if (error instanceof ApiError) {
          setMsg(error.message || 'No se pudo enviar la solicitud. Intenta nuevamente.');
        } else {
          setMsg('No se pudo enviar la solicitud. Revisa tu conexión o intenta nuevamente.');
        }
      } finally {
        setRegisterLoading(false);
      }
      return;
    }

    const newUser: ClientProfile = {
      id: `u-custom-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      phoneNumber: cleanPhone,
      whatsappOptIn,
      role: 'client',
      status: 'pending',
      avatar:
        gender === 'M'
          ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      tokens: 1000,
      age,
      gender,
      muscleMass: undefined,
      waterPercent: undefined,
      experienceLevel: experience,
      activityLevel: undefined,
      injuries: 'Ninguna reportada',
      weaknesses: 'General',
      attendanceRate: 100,
      retentionRisk: 'Bajo',
      lastAttendance: 'Recién registrado',
      plan: 'Imperial Platinum Pass',
      goal,
      weight,
      height,
      streak: 1,
    };

    onRegister(newUser);
    setMsg('Solicitud creada. Tu cuenta queda pendiente de aprobación.');
    setTimeout(() => setView('login'), 2500);
  };

  const handleForgotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const response = await requestPasswordReset(forgotEmail.trim().toLowerCase());
      setMsg(response.detail || 'Solicitud recibida. El equipo validará tu cuenta y te ayudará a restablecer el acceso.');
      setTimeout(() => setView('login'), 5000);
    } catch {
      setMsg('Solicitud recibida. El equipo validará tu cuenta y te ayudará a restablecer el acceso.');
      setTimeout(() => setView('login'), 3500);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!resetToken || !newResetPassword) {
      setMsg('Ingresa el token y la nueva contraseña.');
      return;
    }

    if (newResetPassword.length < 8) {
      setMsg('La nueva contraseña debe tener mínimo 8 caracteres.');
      return;
    }

    setResetLoading(true);
    try {
      await resetPasswordWithToken(resetToken, newResetPassword);
      setMsg('Contraseña restablecida correctamente. Ya puedes iniciar sesión con tu nueva clave.');
      setResetToken('');
      setNewResetPassword('');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setView('login'), 2500);
    } catch {
      setMsg('No se pudo restablecer la contraseña. Revisa que el enlace no haya expirado.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-start md:justify-center items-center px-4 py-6 md:py-10 relative overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_18%_15%,rgba(220,38,38,0.24),transparent_32%),radial-gradient(circle_at_82%_78%,rgba(120,113,108,0.18),transparent_34%),linear-gradient(135deg,#050505_0%,#111111_45%,#020202_100%)]">
      <div
        className="absolute inset-0 opacity-[0.14] bg-cover bg-center"
        style={{ backgroundImage: `url(${loginBackgroundUrl})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.78)_42%,rgba(127,29,29,0.22)_100%)]" />
      <div className="absolute -left-28 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full border border-white/5 bg-white/[0.03] blur-[1px]" />
      <div className="absolute right-[-120px] top-[-90px] h-[420px] w-[620px] rotate-[-18deg] bg-gradient-to-r from-red-700/30 via-white/10 to-transparent blur-3xl" />
      <div className="absolute bottom-[-110px] left-[12%] h-80 w-80 rounded-full bg-red-700/20 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center">
        <img
          src={logoUrl}
          alt=""
          className="w-[min(155vw,1450px)] md:w-[min(135vw,1600px)] max-w-none opacity-[0.10] object-contain drop-shadow-[0_0_90px_rgba(220,38,38,0.28)]"
        />
      </div>

      <div className="text-center mb-8 z-10">
        <div className="mb-4 flex justify-center">
          <ImperialLogoMark size="lg" className="drop-shadow-[0_0_35px_rgba(255,255,255,0.16)]" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-400 mb-3 tracking-widest uppercase">
          <Sparkles className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Plataforma Fitness Premium
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
          {mainName}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700">
            {highlightedName}
          </span>
        </h1>
        <p className="text-neutral-400 text-sm mt-2 font-light tracking-wide max-w-sm mx-auto">
          Plataforma profesional para rendimiento físico, nutrición y seguimiento personalizado
        </p>
      </div>

      <div className="w-full max-w-md bg-neutral-950/78 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.7)] p-6 md:p-8 z-10 ring-1 ring-red-500/10">
        {msg && (
          <div className="mb-4 p-3 bg-neutral-900 border border-red-500/30 text-red-400 text-xs rounded-lg text-center animate-fade-in">
            {msg}
          </div>
        )}

        {view === 'login' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white tracking-wide">Acceso Seguro</h2>
              <span className="text-xs text-neutral-500">v1.19.1</span>
            </div>

            <form onSubmit={handleCustomLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5 font-medium">Correo Electrónico</label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="julian@client.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setMsg(''); }}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-red-600 transition-colors placeholder:text-neutral-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs text-neutral-400 uppercase tracking-wider font-medium">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setMsg(''); }}
                    className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                  >
                    ¿Olvidaste tu clave?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setMsg(''); }}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-11 text-sm text-white focus:outline-none focus:border-red-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full disabled:opacity-70 disabled:cursor-not-allowed bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium text-sm py-2.5 rounded-lg transition-all shadow-lg shadow-red-950/30 flex items-center justify-center gap-2 mt-2"
              >
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} {authLoading ? 'Preparando inicio...' : 'Ingresar a Imperial Fitness'}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-neutral-800 pt-5">
              <p className="text-xs text-neutral-400">
                ¿Aún no tienes membresía digital?{' '}
                <button
                  type="button"
                  onClick={() => { setView('register'); setMsg(''); }}
                  className="text-red-500 font-semibold hover:underline"
                >
                  Solicitar acceso como cliente
                </button>
              </p>
            </div>
          </div>
        )}

        {view === 'register' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-red-500" /> Solicitud de acceso cliente
              </h2>
              <button type="button" onClick={() => setView('login')} className="text-xs text-neutral-500 hover:text-white">
                Volver
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-neutral-400 uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej. Andrés Jaramillo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 uppercase mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="andres@imperial.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 uppercase mb-1">Número de WhatsApp</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="Ej. +57 300 000 0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 pl-8 text-xs text-white focus:outline-none focus:border-red-600"
                    required
                  />
                </div>
                <label className="mt-2 flex items-start gap-2 text-[10px] text-neutral-500">
                  <input
                    type="checkbox"
                    checked={whatsappOptIn}
                    onChange={(e) => setWhatsappOptIn(e.target.checked)}
                    className="mt-0.5 accent-red-600"
                  />
                  Autorizo seguimiento de mi proceso por WhatsApp por parte del equipo Imperial Fitness.
                </label>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 uppercase mb-1">Experiencia</label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value as ExperienceLevel)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
                >
                  <option value="Principiante">Principiante</option>
                  <option value="Intermedio">Intermedio</option>
                  <option value="Avanzado">Avanzado</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 uppercase mb-1">Contraseña</label>
                <div className="relative">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 pr-10 text-xs text-white focus:outline-none focus:border-red-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                    aria-label={showRegisterPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[9px] text-neutral-500 mt-1 block">Mínimo 8 caracteres. La cuenta quedará pendiente de aprobación.</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-neutral-400 uppercase mb-1">Edad</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    min={15}
                    max={80}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 uppercase mb-1">Género</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as GenderValue)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-neutral-400 uppercase mb-1">Estatura (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    min={80}
                    max={250}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 uppercase mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    min={20}
                    max={300}
                    step="0.1"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 uppercase mb-1">Objetivo Físico</label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Ej. Pérdida de grasa agresiva"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <button
                type="submit"
                disabled={registerLoading}
                className="w-full disabled:opacity-70 disabled:cursor-not-allowed bg-red-600 hover:bg-red-500 text-white font-medium text-xs py-2.5 rounded-lg transition-all mt-3 flex items-center justify-center gap-1.5"
              >
                {registerLoading ? 'Enviando solicitud...' : 'Enviar solicitud'} {registerLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </form>
          </div>
        )}

        {view === 'forgot' && (
          <div className="animate-fade-in text-center py-2">
            <Key className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-base font-bold text-white mb-1">Recuperación de Cuenta</h2>
            <p className="text-xs text-neutral-400 mb-4">
              Solicita recuperación. Si el correo existe, el equipo administrador validará tu cuenta y te ayudará a restablecer el acceso.
            </p>

            <form onSubmit={handleForgotSubmit} className="space-y-3 text-left">
              <div>
                <label className="block text-[11px] text-neutral-400 uppercase mb-1">Tu Correo Registrado</label>
                <input
                  type="email"
                  placeholder="usuario@imperial.co"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <button type="submit" disabled={forgotLoading} className="w-full bg-neutral-100 hover:bg-white disabled:opacity-70 disabled:cursor-not-allowed text-black font-semibold text-xs py-2.5 rounded-lg transition-all flex items-center justify-center gap-2">
                {forgotLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {forgotLoading ? 'Enviando...' : 'Solicitar Recuperación'}
              </button>
            </form>

            <button type="button" onClick={() => setView('login')} className="mt-4 text-xs text-neutral-500 hover:text-white">
              Regresar al Login
            </button>
          </div>
        )}

        {view === 'reset' && (
          <div className="animate-fade-in text-center py-2">
            <Key className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-base font-bold text-white mb-1">Crear nueva contraseña</h2>
            <p className="text-xs text-neutral-400 mb-4">Ingresa el token recibido por correo o usa el token cargado desde el enlace seguro.</p>
            <form onSubmit={handleResetSubmit} className="space-y-3 text-left">
              <div>
                <label className="block text-[11px] text-neutral-400 uppercase mb-1">Token de recuperación</label>
                <input value={resetToken} onChange={(e) => setResetToken(e.target.value)} required className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600" />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 uppercase mb-1">Nueva contraseña</label>
                <div className="relative"><input type={showResetPassword ? 'text' : 'password'} minLength={8} value={newResetPassword} onChange={(e) => setNewResetPassword(e.target.value)} required className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 pr-10 text-xs text-white focus:outline-none focus:border-red-600" /><button type="button" onClick={() => setShowResetPassword(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white" aria-label={showResetPassword ? 'Ocultar contraseña' : 'Ver contraseña'}>{showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
              </div>
              <button type="submit" disabled={resetLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold text-xs py-2.5 rounded-lg transition-all flex items-center justify-center gap-2">{resetLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {resetLoading ? 'Restableciendo...' : 'Restablecer contraseña'}</button>
            </form>
            <button type="button" onClick={() => setView('login')} className="mt-4 text-xs text-neutral-500 hover:text-white">Regresar al Login</button>
          </div>
        )}
      </div>

      <div className="mt-8 text-center text-neutral-600 text-[11px] space-y-1 z-10">
        <p>IMPERIAL FITNESS &copy; 2026. Todos los derechos reservados.</p>
        <p className="flex items-center justify-center gap-3 text-neutral-500">
          <span>Sede Ansermanuevo</span> &bull; <span>Plataforma v1.9</span>
        </p>
      </div>
    </div>
  );
};
