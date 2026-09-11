import React, { useMemo, useState } from 'react';
import type { FoodItem } from '../data/foodDatabase';
import { FoodImageOverrides, getFoodMedia } from '../data/foodMedia';

interface FoodImageProps {
  name: string;
  category?: FoodItem['category'] | string;
  overrides?: FoodImageOverrides;
  className?: string;
  compact?: boolean;
  showSource?: boolean;
}

export const FoodImage: React.FC<FoodImageProps> = ({
  name,
  category,
  overrides = {},
  className = '',
  compact = false,
  showSource = false,
}) => {
  const [failed, setFailed] = useState(false);
  const media = useMemo(() => getFoodMedia(name, category, overrides), [name, category, overrides]);
  const fallback = getFoodMedia('alimento', 'snack', {});
  const imageUrl = failed ? fallback.imageUrl : media.imageUrl;

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 ${className}`}>
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-2 pb-2 pt-6">
        {!compact && <span className="line-clamp-1 block text-[10px] font-black uppercase tracking-wide text-white">{media.label}</span>}
        {showSource && <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wide text-neutral-300">{media.isCustom ? 'Imagen admin' : 'Imagen Imperial'}</span>}
      </div>
    </div>
  );
};
