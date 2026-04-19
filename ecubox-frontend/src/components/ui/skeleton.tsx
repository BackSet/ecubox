import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Bloque animado base para construir skeletons de carga. Sigue el mismo token
 * que `TableRowsSkeleton` para que la pulsación se vea uniforme en toda la
 * UI. Se exporta como primitivo para que cada arquetipo (KPI, card, lista,
 * formulario, etc.) construya skeletons estructurales sobre él.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[var(--color-muted)]/70',
        className,
      )}
      aria-hidden
      {...props}
    />
  );
}
