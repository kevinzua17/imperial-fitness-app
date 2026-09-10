import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  description,
  badge,
  icon,
  defaultOpen = false,
  children,
  className = '',
  contentClassName = '',
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
  <details
    open={open}
    onToggle={(event) => setOpen(event.currentTarget.open)}
    className={`group overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950/95 shadow-2xl shadow-black/20 ${className}`}
  >
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 md:px-5 [&::-webkit-details-marker]:hidden">
      <div className="flex min-w-0 items-center gap-3">
        {icon && <div className="shrink-0 text-red-400">{icon}</div>}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-black text-white md:text-base">{title}</h2>
            {badge}
          </div>
          {description && <p className="mt-1 text-[11px] leading-relaxed text-neutral-500 md:text-xs">{description}</p>}
        </div>
      </div>
      <span className="flex shrink-0 items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-neutral-300 group-open:border-red-500/40 group-open:text-red-200">
        <span className="group-open:hidden">Abrir</span>
        <span className="hidden group-open:inline">Cerrar</span>
        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
      </span>
    </summary>
    <div className={`border-t border-neutral-800 p-4 md:p-5 ${contentClassName}`}>{children}</div>
  </details>
  );
};
