import React, { useMemo, useState } from 'react';
import { ArrowRight, ImageOff, Maximize2, PlayCircle, X } from 'lucide-react';
import { getExerciseMedia, hasTrueMotion, mediaKindLabel } from '../data/exerciseMedia';
import { ExerciseCatalogItem } from '../data/exerciseCatalog';

interface ExerciseImageProps {
  name: string;
  imageUrl?: string | null;
  imageStartUrl?: string | null;
  imageEndUrl?: string | null;
  alternateImageUrls?: string[] | null;
  animationUrl?: string | null;
  videoUrl?: string | null;
  mediaType?: ExerciseCatalogItem['mediaType'];
  mediaSource?: string | null;
  mediaLicense?: string | null;
  attribution?: string | null;
  mediaNotes?: string | null;
  primaryMuscle?: string;
  muscleGroups?: string[];
  equipment?: string;
  coachingNotes?: string;
  className?: string;
  compact?: boolean;
  zoomable?: boolean;
}

function cleanText(value?: string | null): string | undefined {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

export const ExerciseImage: React.FC<ExerciseImageProps> = ({
  name,
  imageUrl,
  imageStartUrl,
  imageEndUrl,
  alternateImageUrls,
  animationUrl,
  videoUrl,
  mediaType,
  mediaSource,
  mediaLicense,
  attribution,
  mediaNotes,
  primaryMuscle,
  muscleGroups,
  equipment,
  coachingNotes,
  className = '',
  compact = false,
  zoomable = true,
}) => {
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const media = useMemo(
    () => getExerciseMedia({
      name,
      imageUrl: failed ? undefined : cleanText(imageUrl),
      imageStartUrl: failed ? undefined : cleanText(imageStartUrl),
      imageEndUrl: failed ? undefined : cleanText(imageEndUrl),
      alternateImageUrls: failed ? undefined : alternateImageUrls || undefined,
      animationUrl: failed ? undefined : cleanText(animationUrl),
      videoUrl: failed ? undefined : cleanText(videoUrl),
      mediaType,
      mediaSource: cleanText(mediaSource),
      mediaLicense: cleanText(mediaLicense),
      attribution: cleanText(attribution),
      mediaNotes: cleanText(mediaNotes),
      primaryMuscle,
      muscleGroups,
      equipment,
      coachingNotes,
    }),
    [alternateImageUrls, animationUrl, attribution, coachingNotes, equipment, failed, imageEndUrl, imageStartUrl, imageUrl, mediaLicense, mediaNotes, mediaSource, mediaType, muscleGroups, name, primaryMuscle, videoUrl],
  );

  const height = compact ? 'h-20 w-24 sm:h-24 sm:w-28' : 'h-36 sm:h-44 w-full';
  const label = mediaKindLabel(media);
  const isTrueMotion = hasTrueMotion(media);

  if (!media.src || media.kind === 'empty') {
    return (
      <div className={`${height} ${className} rounded-xl border border-neutral-800 bg-neutral-950 flex flex-col items-center justify-center text-neutral-500`}>
        <ImageOff className={compact ? 'w-5 h-5' : 'w-7 h-7'} />
        {!compact && <span className="mt-1 text-[10px] font-bold uppercase tracking-wide">Visual pendiente</span>}
      </div>
    );
  }

  const renderRangePair = (large = false) => {
    if (!media.imageStartUrl || !media.imageEndUrl) return null;

    if (large) {
      return (
        <div className="w-full h-full grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)] gap-3 items-center">
          <div className="relative min-h-[220px] sm:min-h-[360px] rounded-3xl border border-neutral-800 bg-black/70 overflow-hidden flex items-center justify-center p-2">
            <img src={media.imageStartUrl} alt={`${name} - inicio`} loading="lazy" onError={() => setFailed(true)} className="max-h-full max-w-full object-contain rounded-2xl" />
            <span className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">Inicio</span>
          </div>
          <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-full border border-red-900/60 bg-red-950/30 text-red-200">
            <ArrowRight className="h-7 w-7" />
          </div>
          <div className="relative min-h-[220px] sm:min-h-[360px] rounded-3xl border border-neutral-800 bg-black/70 overflow-hidden flex items-center justify-center p-2">
            <img src={media.imageEndUrl} alt={`${name} - final`} loading="lazy" onError={() => setFailed(true)} className="max-h-full max-w-full object-contain rounded-2xl" />
            <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">Final</span>
          </div>
        </div>
      );
    }

    return (
      <div className={`relative h-full w-full overflow-hidden bg-black ${compact ? '' : 'exercise-range-pair'}`}>
        <img src={media.imageStartUrl} alt={`${name} - inicio`} loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover exercise-range-start" />
        <img src={media.imageEndUrl} alt={`${name} - final`} loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover exercise-range-end" />
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center pointer-events-none">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-400/50 bg-black/70 text-red-200 exercise-range-arrow">
            <ArrowRight className="h-5 w-5" />
          </span>
        </div>
        {!compact && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-wide text-white">
            <span className="rounded-full bg-red-600/90 px-2 py-1">Inicio</span>
            <span className="rounded-full bg-emerald-600/90 px-2 py-1">Final</span>
          </div>
        )}
      </div>
    );
  };

  const renderMedia = (large = false) => {
    if (media.kind === 'range-pair') return renderRangePair(large);
    const mediaClass = large ? 'max-h-full w-auto max-w-full object-contain rounded-2xl' : `h-full w-full ${compact ? 'object-cover' : 'object-cover'} ${media.kind === 'motion-preview' ? 'exercise-motion-preview' : ''}`;
    if (media.kind === 'video') {
      return (
        <video
          src={media.src}
          poster={media.imageUrl}
          muted
          loop
          playsInline
          autoPlay
          controls={large}
          preload="metadata"
          onError={() => setFailed(true)}
          className={mediaClass}
        />
      );
    }
    return <img src={media.src} alt={name} loading="lazy" onError={() => setFailed(true)} className={mediaClass} />;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => zoomable && setOpen(true)}
        className={`${height} ${className} group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 text-left ${zoomable ? 'cursor-zoom-in' : 'cursor-default'}`}
        aria-label={`Ver técnica visual de ${name}`}
      >
        {renderMedia(false)}
        {!compact && media.kind === 'motion-preview' && <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent exercise-motion-sweep" />}
        {!compact && media.kind === 'motion-preview' && (
          <div className="absolute bottom-2 left-2 right-2 grid grid-cols-3 gap-1 pointer-events-none">
            {media.rangeSteps.map(step => (
              <span key={step.phase} className="rounded-full bg-black/70 px-1.5 py-1 text-center text-[8px] font-black uppercase tracking-wide text-white border border-white/10">
                {step.phase}
              </span>
            ))}
          </div>
        )}
        <span className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${isTrueMotion ? 'bg-red-600 text-white' : 'bg-black/75 text-red-200 border border-red-900/50'}`}>
          {isTrueMotion ? <PlayCircle className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
          {label}
        </span>
        {zoomable && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-[10px] font-black text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Maximize2 className="w-3 h-3" /> Técnica
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-sm p-3 sm:p-6 flex flex-col animate-fade-in" role="dialog" aria-modal="true">
          <div className="mx-auto mb-3 flex w-full max-w-6xl items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3">
            <div className="min-w-0">
              <span className="block text-[10px] uppercase tracking-[0.22em] text-red-400 font-black">{label}</span>
              <h3 className="truncate text-sm sm:text-base font-black text-white">{name}</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-neutral-900 p-2 text-neutral-300 hover:bg-red-600 hover:text-white"
              aria-label="Cerrar técnica visual"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-3 overflow-hidden">
            <div className="flex min-h-[280px] items-center justify-center overflow-auto rounded-3xl border border-neutral-800 bg-neutral-950 p-2 sm:p-4">
              {renderMedia(true)}
            </div>
            <aside className="overflow-y-auto rounded-3xl border border-neutral-800 bg-neutral-950 p-4 space-y-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-black">Músculo / equipo</span>
                <p className="mt-1 text-sm font-bold text-white">{primaryMuscle || 'Músculo según catálogo'}</p>
                {equipment && <p className="text-xs text-neutral-400">{equipment}</p>}
              </div>
              {media.kind === 'motion-preview' && (
                <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-3 text-[11px] text-amber-100 leading-relaxed">
                  <strong>Importante:</strong> esta fuente trae foto estática. Por eso Imperial Fitness muestra abajo una guía de rango para entender dónde inicia, cómo se recorre y dónde termina el movimiento.
                </div>
              )}
              {media.kind === 'range-pair' && (
                <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-3 text-[11px] text-emerald-100 leading-relaxed">
                  <strong>Vista inicio/final:</strong> esta base trae dos imágenes del ejercicio. Imperial Fitness las muestra como recorrido visual con flecha y simulación tipo GIF para entender mejor el rango.
                </div>
              )}
              <div>
                <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-black">Rango del movimiento</span>
                <div className="mt-2 space-y-2">
                  {media.rangeSteps.map((step, index) => (
                    <div key={step.phase} className="rounded-2xl border border-neutral-800 bg-black/40 p-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">{index + 1}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-300">{step.phase}</span>
                      </div>
                      <p className="mt-2 text-xs text-neutral-300 leading-relaxed">{step.cue}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-[11px] text-neutral-300">{media.tempoCue}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-black">Técnica rápida</span>
                <ol className="mt-2 space-y-2 text-xs text-neutral-300 list-decimal list-inside">
                  {media.techniqueSteps.map(step => <li key={step}>{step}</li>)}
                </ol>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-black">Evita</span>
                <ul className="mt-2 space-y-2 text-xs text-neutral-400 list-disc list-inside">
                  {media.commonMistakes.map(mistake => <li key={mistake}>{mistake}</li>)}
                </ul>
              </div>
              {coachingNotes && <p className="rounded-2xl border border-neutral-800 bg-black/40 p-3 text-xs text-neutral-300 leading-relaxed">{coachingNotes}</p>}
              <div className="rounded-2xl border border-neutral-800 bg-black/40 p-3 text-[10px] text-neutral-500 leading-relaxed">
                <p><strong className="text-neutral-300">Fuente:</strong> {media.source}</p>
                <p><strong className="text-neutral-300">Licencia:</strong> {media.license}</p>
                {media.attribution && <p><strong className="text-neutral-300">Atribución:</strong> {media.attribution}</p>}
                {media.notes && <p className="mt-2">{media.notes}</p>}
              </div>
            </aside>
          </div>
          <p className="mt-3 text-center text-[11px] text-neutral-500">Toca la X para cerrar y volver a la rutina.</p>
        </div>
      )}
    </>
  );
};
