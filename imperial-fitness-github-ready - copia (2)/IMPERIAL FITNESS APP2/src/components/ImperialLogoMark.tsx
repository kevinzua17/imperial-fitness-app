import React from 'react';

interface ImperialLogoMarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'default' | 'watermark';
}

const sizes = {
  sm: 'w-9 h-9 p-0.5',
  md: 'w-14 h-14 p-1',
  lg: 'w-24 h-24 p-1.5',
  xl: 'w-40 h-40 p-2'
};

export const ImperialLogoMark: React.FC<ImperialLogoMarkProps> = ({ size = 'md', className = '', variant = 'default' }) => {
  const isWatermark = variant === 'watermark';

  return (
    <div
      className={`relative ${sizes[size]} ${isWatermark ? 'bg-white/70' : 'bg-white/95'} rounded-full border border-white/20 shadow-[0_18px_55px_rgba(0,0,0,0.45)] ${className}`}
      aria-label="Imperial Fitness logo"
    >
      <img
        src="/logo-imperial-fitness.png"
        alt="Imperial Fitness"
        className="h-full w-full rounded-full object-contain"
        loading="eager"
      />
    </div>
  );
};
