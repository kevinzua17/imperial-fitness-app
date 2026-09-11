import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, ShieldCheck, UploadCloud, X } from 'lucide-react';
import { ClientProfile, ProgressPhoto } from '../data/mockData';
import { listBodyMetricsFromApi, listProgressPhotosFromApi, uploadProgressPhotoToApi } from '../services/progressService';
import { ApiError } from '../services/api';

interface ProgressPhotosViewProps {
  currentUser: ClientProfile;
  users: ClientProfile[];
  onAddPhoto: (photo: ProgressPhoto, clientId: string) => void;
}

export const ProgressPhotosView: React.FC<ProgressPhotosViewProps> = ({ currentUser, users, onAddPhoto }) => {
  const clientsOnly = users.filter(u => u.role === 'client');
  const initialClient = currentUser.role === 'client' ? currentUser : clientsOnly[0] || currentUser;

  const [targetClientId, setTargetClientId] = useState<string>(initialClient.id);
  const activeClientObj = (users.find(u => u.id === targetClientId) as ClientProfile) || initialClient;
  const [photosList, setPhotosList] = useState<ProgressPhoto[]>(activeClientObj?.progressPhotos || []);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [weight, setWeight] = useState(activeClientObj?.weight || 0);
  const [bodyFat, setBodyFat] = useState(activeClientObj?.bodyFat || 0);
  const [label, setLabel] = useState<ProgressPhoto['label']>('Frente');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPhotosAndBiometrics() {
      try {
        const [photos, metrics] = await Promise.all([
          listProgressPhotosFromApi(targetClientId),
          listBodyMetricsFromApi(targetClientId).catch(() => []),
        ]);
        if (cancelled) return;
        setPhotosList(photos);
        const latestMetric = metrics[metrics.length - 1];
        setWeight(latestMetric?.weight ?? activeClientObj?.weight ?? 0);
        setBodyFat(latestMetric?.body_fat ?? activeClientObj?.bodyFat ?? 0);
      } catch {
        if (!cancelled) {
          setPhotosList(activeClientObj?.progressPhotos || []);
          setWeight(activeClientObj?.weight || 0);
          setBodyFat(activeClientObj?.bodyFat || 0);
        }
      }
    }
    loadPhotosAndBiometrics();
    return () => {
      cancelled = true;
    };
  }, [targetClientId, activeClientObj?.progressPhotos, activeClientObj?.weight, activeClientObj?.bodyFat]);

  const handleFile = (file?: File) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage('Formato no permitido. Usa JPG, PNG o WEBP.');
      return;
    }
    setSelectedFile(file);
    setMessage('');
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      setMessage('Selecciona o arrastra una imagen antes de guardar.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    try {
      const uploadedPhoto = await uploadProgressPhotoToApi({
        clientId: targetClientId,
        file: selectedFile,
        label,
        weight: Number(weight) > 0 ? Number(weight) : undefined,
        bodyFat: Number(bodyFat) > 0 ? Number(bodyFat) : undefined,
      });
      setPhotosList(prev => [uploadedPhoto, ...prev]);
      onAddPhoto(uploadedPhoto, targetClientId);
      setSelectedFile(null);
      setMessage('Foto subida y guardada correctamente.');
    } catch (error) {
      setMessage(error instanceof ApiError
        ? error.message
        : 'No se pudo subir la imagen. Revisa que el archivo sea válido e intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClientChange = (clientId: string) => {
    setTargetClientId(clientId);
    const found = users.find(u => u.id === clientId);
    if (found) {
      setWeight(found.weight || 0);
      setBodyFat(found.bodyFat || 0);
    }
    setSelectedFile(null);
    setMessage('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 p-6 rounded-2xl border border-neutral-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/80 text-xs text-red-400 mb-2 tracking-wider uppercase font-medium">
            <Camera className="w-3.5 h-3.5" /> Seguimiento Visual Antropométrico
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Expediente de Fotos de Progreso</h1>
          <p className="text-neutral-400 text-sm mt-1 max-w-xl font-light">
            Selecciona una imagen desde el ordenador, abre la galería del celular o arrástrala al área de carga. La imagen quedará guardada en tu historial de progreso.
          </p>
        </div>

        {currentUser.role !== 'client' && (
          <div className="bg-black/60 p-3 rounded-xl border border-neutral-800 flex items-center gap-3">
            <span className="text-xs text-neutral-400 font-medium">Socio:</span>
            <select
              value={targetClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="bg-neutral-900 text-white text-xs font-semibold rounded-lg px-3 py-2 border border-neutral-700 focus:outline-none focus:border-red-600"
            >
              {clientsOnly.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {message && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 h-fit space-y-5">
          <div className="flex items-center gap-2 border-b border-neutral-900 pb-3">
            <ImagePlus className="w-4 h-4 text-red-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Subir imagen de progreso</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`min-h-[210px] cursor-pointer rounded-2xl border-2 border-dashed p-5 flex flex-col items-center justify-center text-center transition-all ${
                isDragging ? 'border-red-500 bg-red-950/20' : 'border-neutral-700 bg-neutral-900/40 hover:border-red-700 hover:bg-neutral-900/70'
              }`}
            >
              <UploadCloud className="w-10 h-10 text-red-500 mb-3" />
              <span className="text-sm font-bold text-white block">
                {selectedFile ? selectedFile.name : 'Selecciona o arrastra una imagen'}
              </span>
              <span className="text-xs text-neutral-500 mt-1 max-w-xs">
                JPG, PNG o WEBP. Usa una foto clara, frontal o lateral, según el seguimiento indicado.
              </span>
              {selectedFile && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                  className="mt-3 inline-flex items-center gap-1 text-[10px] text-neutral-300 bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded"
                >
                  <X className="w-3 h-3" /> Quitar archivo
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">Peso (kg)</label>
                <input type="number" step="0.1" required value={weight} onChange={e => setWeight(Number(e.target.value))} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-600 font-mono" />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">Grasa Corporal (%)</label>
                <input type="number" step="0.1" required value={bodyFat} onChange={e => setBodyFat(Number(e.target.value))} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-600 font-mono" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">Ángulo de la Toma</label>
              <select value={label} onChange={e => setLabel(e.target.value as ProgressPhoto['label'])} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-600">
                <option value="Frente">Frente</option>
                <option value="Perfil">Perfil</option>
                <option value="Espalda">Espalda</option>
                <option value="Libre">Toma Libre</option>
              </select>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 text-white font-bold text-xs p-3 rounded-xl transition-colors cursor-pointer mt-2 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Subiendo imagen...' : 'Subir y guardar'}
            </button>
          </form>

          <div className="bg-neutral-900/40 p-3 rounded-xl border border-neutral-900 text-[11px] text-neutral-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>Tu foto queda protegida y asociada a tu historial de progreso.</span>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center bg-neutral-950 p-4 rounded-xl border border-neutral-850">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Historial de Transformaciones de {activeClientObj?.name}</span>
            <span className="text-xs text-neutral-400 font-mono">{photosList.length} registros</span>
          </div>

          {photosList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {photosList.map((photo) => (
                <div key={photo.id} className="bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden group hover:border-neutral-700 transition-all flex flex-col">
                  <div className="relative h-72 w-full bg-black flex items-center justify-center overflow-hidden">
                    <img src={photo.url} alt={`Progreso ${photo.label}`} className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" />
                    <span className="absolute top-3 left-3 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-xs border border-neutral-800">Toma: {photo.label}</span>
                    <span className="absolute bottom-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow">{photo.date}</span>
                  </div>
                  <div className="p-3 bg-neutral-950 border-t border-neutral-900 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-neutral-500 text-[10px] block">Peso Registrado</span>
                      <strong className="text-white font-mono">{photo.weight} kg</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-neutral-500 text-[10px] block">Grasa Medida</span>
                      <strong className="text-amber-400 font-mono">{photo.bodyFat}%</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-neutral-950 border border-neutral-850 rounded-2xl p-12 text-center">
              <Camera className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-neutral-300">Sin capturas visuales registradas</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">Utiliza el panel lateral para subir tu primera foto de progreso.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};