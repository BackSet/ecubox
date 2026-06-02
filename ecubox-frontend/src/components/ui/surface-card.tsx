import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type SurfaceCardVariant = 'default' | 'compact' | 'elevated' | 'interactive';

interface SurfaceCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceCardVariant;
}

const VARIANT_CLASS: Record<SurfaceCardVariant, string> = {
  default: 'surface-card tracking-surface',
  compact: 'surface-card-compact tracking-surface',
  elevated: 'surface-card-elevated tracking-surface',
  interactive: 'surface-card tracking-surface card-interactive',
};

export function SurfaceCard({ className, variant = 'default', ...props }: SurfaceCardProps) {
  return <div className={cn(VARIANT_CLASS[variant], className)} {...props} />;
}
