import { cn } from '@/lib/utils';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Skeleton } from '@/components/ui/skeleton';

interface SurfaceCardSkeletonProps {
  /** Si true, pinta una línea de título + subtítulo arriba. Default: true. */
  withHeader?: boolean;
  /** Cuántas líneas pintar en el cuerpo. Default: 3. */
  bodyLines?: number;
  /** Variante de la card (igual que SurfaceCard). */
  variant?: 'default' | 'compact' | 'elevated';
  /** Padding extra. Default: `p-4`. */
  className?: string;
}

/**
 * Skeleton genérico para una `SurfaceCard`. Pinta un header opcional
 * (título + subtítulo) y `bodyLines` filas. Útil como bloque modular en
 * detalles, paneles y bloques de tracking.
 */
export function SurfaceCardSkeleton({
  withHeader = true,
  bodyLines = 3,
  variant = 'default',
  className,
}: SurfaceCardSkeletonProps) {
  const widths = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-8/12'];
  return (
    <SurfaceCard variant={variant} className={cn('space-y-3 p-4', className)}>
      {withHeader && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: bodyLines }).map((_, i) => (
          <Skeleton
            key={`body-line-${i}`}
            className={cn('h-3', widths[i % widths.length])}
          />
        ))}
      </div>
    </SurfaceCard>
  );
}
