import React, { useEffect, useState } from 'react';
import { User, Lock, Key, Sparkles, LogIn, UserPlus, ArrowRight } from 'lucide-react';
import { ClientProfile } from '../data/mockData';
import { ImperialLogoMark } from './ImperialLogoMark';
import type { BrandingSettings } from '../services/mediaService';
import { requestPasswordReset, resetPasswordWithToken } from '../services/authService';

interface LoginScreenProps {
  onLogin: (user: ClientProfile) => void;
  onLoginWithCredentials?: (email: string, password: string) => Promise<void>;
  onRegisterClientWithCredentials?: (payload: { name: string; email: string; password: string; goal?: string }) => Promise<void>;
  branding?: BrandingSettings | null;
  users: ClientProfile[];
  onRegister: (newUser: ClientProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onLoginWithCredentials, onRegisterClientWithCredentials, branding, users, onRegister }) => {
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  
  // Custom register form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [goal, setGoal] = useState('Hipertrofia y Acondicionamiento Premium');
  const [experience, setExperience] = useState<'Principiante' | 'Intermedio' | 'Avanzado'>('Intermedio');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [age, setAge] = useState(25);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  
  // Simple error/success states
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('reset_token');
    if (token) {
      setResetToken(token);
      setView('reset');
    }
  }, []);

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLoginWithCredentials && email) {
      onLoginWithCredentials(email, password).catch(() => {
        setMsg('No se pudo iniciar sesión. Si tu cuenta está pendiente, espera aprobación del administrador.');
      });
      return;
    }
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      onLogin(found);
    } else {
      setMsg('Usuario no encontrado. Utiliza el acceso rápido abajo o regístrate.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setMsg('Por favor completa los campos obligatorios.');
      return;
    }
    
    const newUser: ClientProfile = {
      id: `u-custom-${Date.now()}`,
      name,
      email,
      role: 'client',
      status: 'pending',
      avatar: gender === 'M' 
        ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      tokens: 1000,
      age,
      gender,
      muscleMass: gender === 'M' ? 38 : 26,
      waterPercent: 58,
      experienceLevel: experience,
      activityLevel: 'Moderado',
      injuries: 'Ninguna reportada',
      weaknesses: 'General',
      attendanceRate: 100,
      retentionRisk: 'Bajo',
      lastAttendance: 'Recién registrado',
      plan: 'Imperial Platinum Pass',
      goal,
      streak: 1
    };

    if (onRegisterClientWithCredentials) {
      onRegisterClientWithCredentials({ name, email, password, goal }).then(() => {
        setMsg('Solicitud enviada. Tu cuenta queda pendiente de aprobación por el administrador.');
        setTimeout(() => setView('login'), 2500);
      }).catch(() => {
        setMsg('No se pudo enviar la solicitud. Revisa la conexión con la API o intenta nuevamente.');
      });
      return;
    }

    onRegister(newUser);
    setMsg('Solicitud local creada. Tu cuenta queda pendiente de aprobación.');
    setTimeout(() => setView('login'), 2500);
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetPasswordWithToken(resetToken, newResetPassword).then(() => {
      setMsg('Contraseña restablecida correctamente. Ya puedes iniciar sesión con tu nueva clave.');
      setResetToken('');
      setNewResetPassword('');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setView('login'), 2500);
    }).catch(() => setMsg('No se pudo restablecer la contraseña. Revisa que el enlace no haya expirado.'));
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestPasswordReset(forgotEmail).then((response) => {
      const devTokenMessage = response.reset_token_dev ? ` Token local: ${response.reset_token_dev}` : '';
      setMsg(`${response.detail || 'Solicitud recibida. El administrador validará tu cuenta y te ayudará a restablecer el acceso.'}${devTokenMessage}`);
      setTimeout(() => setView('login'), 5000);
    }).catch(() => {
      setMsg('Solicitud recibida. El administrador validará tu cuenta y te ayudará a restablecer el acceso.');
      setTimeout(() => setView('login'), 3500);
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 relative overflow-hidden bg-[radial-gradient(circle_at_18%_15%,rgba(220,38,38,0.24),transparent_32%),radial-gradient(circle_at_82%_78%,rgba(120,113,108,0.18),transparent_34%),linear-gradient(135deg,#050505_0%,#111111_45%,#020202_100%)]">
      {/* Fondo premium: textura de sala, alas abstractas y brillo rojo integrado al logo. */}
      <div
        className="absolute inset-0 opacity-[0.14] bg-cover bg-center"
        style={{ backgroundImage: `url(${branding?.login_background_url || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1800&auto=format&fit=crop&q=80'})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.78)_42%,rgba(127,29,29,0.22)_100%)]" />
      <div className="absolute -left-28 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full border border-white/5 bg-white/[0.03] blur-[1px]" />
      <div className="absolute right-[-120px] top-[-90px] h-[420px] w-[620px] rotate-[-18deg] bg-gradient-to-r from-red-700/30 via-white/10 to-transparent blur-3xl" />
      <div className="absolute bottom-[-110px] left-[12%] h-80 w-80 rounded-full bg-red-700/20 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <ImperialLogoMark size="xl" variant="watermark" className="absolute right-[4%] top-[12%] hidden lg:block opacity-[0.18] scale-[2.1]" />

      {/* Brand Header */}
      <div className="text-center mb-8 z-10">
        <div className="mb-4 flex justify-center">
          <ImperialLogoMark size="lg" className="drop-shadow-[0_0_35px_rgba(255,255,255,0.16)]" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-400 mb-3 tracking-widest uppercase">
          <Sparkles className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Plataforma Fitness Premium
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
          {(branding?.gym_name || 'IMPERIAL FITNESS').split(' ')[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700">{(branding?.gym_name || 'IMPERIAL FITNESS').split(' ').slice(1).join(' ') || 'FITNESS'}</span>
        </h1>
        <p className="text-neutral-400 text-sm mt-2 font-light tracking-wide max-w-sm mx-auto">
          Plataforma profesional para rendimiento físico, nutrición y seguimiento personalizado
        </p>
      </div>

      {/* Main Glassmorphism Card */}
      <div className="w-full max-w-md bg-neutral-950/78 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.7)] p-6 md:p-8 z-10 ring-1 ring-red-500/10">
        
        {msg && (
          <div className="mb-4 p-3 bg-neutral-900 border border-red-500/30 text-red-400 text-xs rounded-lg text-center animate-fade-in">
            {msg}
          </div>
        )}

        {/* LOGIN VIEW */}
        {view === 'login' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white tracking-wide">Acceso Seguro</h2>
              <span className="text-xs text-neutral-500">v4.0 Premium</span>
            </div>

            <form onSubmit={handleCustomLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5 font-medium">
                  Correo Electrónico
                </label>
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
                  <label className="block text-xs text-neutral-400 uppercase tracking-wider font-medium">
                    Contraseña
                  </label>
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
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-red-600 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium text-sm py-2.5 rounded-lg transition-all shadow-lg shadow-red-950/30 flex items-center justify-center gap-2 mt-2"
              >
                <LogIn className="w-4 h-4" /> Ingresar al Ecosistema
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

        {/* REGISTER VIEW */}
        {view === 'register' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-red-500" /> Solicitud de acceso cliente
              </h2>
              <button 
                onClick={() => setView('login')}
                className="text-xs text-neutral-500 hover:text-white"
              >
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

              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-[11px] text-neutral-400 uppercase mb-1">Experiencia</label>
                  <select
                    value={experience}
                    onChange={(e) => setExperience(e.target.value as any)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="Principiante">Principiante</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="Avanzado">Avanzado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 uppercase mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
                  required
                />
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
                  <label className="block text-[11px] text-neutral-400 uppercase mb-1">Sexo</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
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
                className="w-full bg-red-600 hover:bg-red-500 text-white font-medium text-xs py-2.5 rounded-lg transition-all mt-3 flex items-center justify-center gap-1.5"
              >
                Enviar solicitud <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* FORGOT PASSWORD VIEW */}
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

              <button
                type="submit"
                className="w-full bg-neutral-100 hover:bg-white text-black font-semibold text-xs py-2.5 rounded-lg transition-all"
              >
                Solicitar Recuperación
              </button>
            </form>

            <button
              onClick={() => setView('login')}
              className="mt-4 text-xs text-neutral-500 hover:text-white"
            >
              Regresar al Login
            </button>
          </div>
        )}

        {/* RESET PASSWORD VIEW */}
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
                <input type="password" minLength={8} value={newResetPassword} onChange={(e) => setNewResetPassword(e.target.value)} required className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-600" />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 rounded-lg transition-all">Restablecer contraseña</button>
            </form>
            <button onClick={() => setView('login')} className="mt-4 text-xs text-neutral-500 hover:text-white">Regresar al Login</button>
          </div>
        )}


      </div>

      {/* Footer Branding info */}
      <div className="mt-8 text-center text-neutral-600 text-[11px] space-y-1 z-10">
        <p>IMPERIAL FITNESS &copy; 2026. Todos los derechos reservados.</p>
        <p className="flex items-center justify-center gap-3 text-neutral-500">
          <span>Sede Ansermanuevo</span> &bull; <span>Plataforma v1.9</span>
        </p>
      </div>
    </div>
  );
};
