import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type SurfaceCardVariant = 'default' | 'compact' | 'elevated';

interface SurfaceCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceCardVariant;
}

const VARIANT_CLASS: Record<SurfaceCardVariant, string> = {
  default: 'surface-card',
  compact: 'surface-card-compact',
  elevated: 'surface-card-elevated',
};

export function SurfaceCard({ className, variant = 'default', ...props }: SurfaceCardProps) {
  return <div className={cn(VARIANT_CLASS[variant], className)} {...props} />;
}
