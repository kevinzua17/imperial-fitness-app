import React, { useEffect, useRef, useState } from 'react';
import { Camera, KeyRound, Loader2, Save, ShieldCheck, User } from 'lucide-react';
import { ClientProfile } from '../data/mockData';
import { uploadAvatarToApi } from '../services/mediaService';
import { changePasswordInApi, updateUserProfileInApi } from '../services/userService';

interface ProfileViewProps {
  currentUser: ClientProfile;
  onAvatarUpdated: (avatarUrl: string) => void;
  onProfileUpdated?: (profile: ClientProfile) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onAvatarUpdated, onProfileUpdated }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [goal, setGoal] = useState(currentUser.goal || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    setName(currentUser.name);
    setEmail(currentUser.email);
    setGoal(currentUser.goal || '');
  }, [currentUser]);

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMsg('Formato no permitido. Usa JPG, PNG o WEBP.');
      return;
    }
    setIsUploading(true);
    setMsg('');
    try {
      const avatarUrl = await uploadAvatarToApi(currentUser.id, file);
      onAvatarUpdated(avatarUrl);
      setMsg('Foto de perfil actualizada correctamente.');
    } catch {
      setMsg('No se pudo subir la foto. Revisa backend y permisos.');
    } finally {
      setIsUploading(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateUserProfileInApi(currentUser.id, { name, email, goal });
      onProfileUpdated?.(updated);
      setMsg('Perfil actualizado correctamente.');
    } catch {
      setMsg('No se pudo actualizar el perfil. Revisa correo duplicado o permisos.');
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await changePasswordInApi(currentUser.id, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setMsg('Contraseña actualizada. Por seguridad, vuelve a iniciar sesión si el sistema te lo solicita.');
    } catch {
      setMsg('No se pudo cambiar la contraseña. Verifica tu contraseña actual.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900 to-black p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-900/60 bg-red-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400 mb-3">
          <User className="w-3.5 h-3.5" /> Perfil personal
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Tu cuenta Imperial Fitness</h1>
        <p className="text-sm text-neutral-400 mt-2">Actualiza datos personales, avatar y contraseña desde un flujo validado por backend.</p>
      </div>

      {msg && <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <div className="text-center">
            <img src={currentUser.avatar} alt={currentUser.name} className="w-40 h-40 rounded-2xl object-contain bg-black border border-neutral-800 mx-auto" />
            <span className="text-xs font-bold text-white block mt-3">{currentUser.name}</span>
            <span className="text-[10px] text-neutral-500 uppercase block">{currentUser.role}</span>
          </div>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
            className={`mt-5 min-h-[150px] cursor-pointer rounded-2xl border-2 border-dashed p-5 flex flex-col items-center justify-center text-center transition-all ${isDragging ? 'border-red-500 bg-red-950/20' : 'border-neutral-700 bg-neutral-900/40 hover:border-red-700'}`}
          >
            {isUploading ? <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-3" /> : <Camera className="w-8 h-8 text-red-500 mb-3" />}
            <span className="text-sm font-bold text-white">{isUploading ? 'Subiendo imagen...' : 'Cambiar foto/avatar'}</span>
            <span className="text-xs text-neutral-500 mt-1">JPG, PNG o WEBP.</span>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={saveProfile} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2"><Save className="w-4 h-4 text-red-500" /><h2 className="text-sm font-bold text-white uppercase tracking-wider">Datos de cuenta</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Nombre</label><input value={name} onChange={e => setName(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
              <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Correo</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
            </div>
            <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Objetivo</label><input value={goal} onChange={e => setGoal(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
            <button className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg">Guardar perfil</button>
          </form>

          <form onSubmit={changePassword} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2"><KeyRound className="w-4 h-4 text-amber-500" /><h2 className="text-sm font-bold text-white uppercase tracking-wider">Seguridad y contraseña</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Contraseña actual</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
              <div><label className="text-[10px] text-neutral-400 uppercase block mb-1">Nueva contraseña</label><input type="password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white" /></div>
            </div>
            <button disabled={!currentPassword || newPassword.length < 8} className="bg-neutral-100 hover:bg-white disabled:bg-neutral-800 disabled:text-neutral-600 text-black text-xs font-bold px-4 py-2 rounded-lg">Actualizar contraseña</button>
          </form>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[11px] text-emerald-200 flex gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Avatar, perfil y contraseña quedan protegidos por permisos: cada usuario gestiona su perfil; el administrador conserva control total.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
