import React, { useState } from 'react';
import { Maximize2, X } from 'lucide-react';

interface ZoomableAvatarProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  modalTitle?: string;
  buttonClassName?: string;
}

export const ZoomableAvatar: React.FC<ZoomableAvatarProps> = ({
  src,
  alt,
  className = 'h-10 w-10 rounded-full',
  fallbackSrc = '/logo-imperial-fitness.png',
  modalTitle,
  buttonClassName = '',
}) => {
  const [open, setOpen] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState(src || fallbackSrc);

  React.useEffect(() => {
    setResolvedSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative shrink-0 cursor-zoom-in overflow-hidden ${buttonClassName}`}
        aria-label={`Ampliar foto de ${alt}`}
      >
        <img
          src={resolvedSrc}
          alt={alt}
          onError={() => setResolvedSrc(fallbackSrc)}
          className={`${className} object-cover bg-black border border-neutral-800`}
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Maximize2 className="h-4 w-4" />
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3">
              <div className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Foto de perfil</span>
                <h3 className="truncate text-sm font-black text-white">{modalTitle || alt}</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-neutral-900 p-2 text-neutral-300 hover:bg-red-600 hover:text-white" aria-label="Cerrar foto ampliada">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex max-h-[78vh] min-h-[300px] items-center justify-center overflow-auto bg-black p-3 sm:p-6">
              <img src={resolvedSrc} alt={alt} className="max-h-[72vh] max-w-full rounded-2xl object-contain" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
