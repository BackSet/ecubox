import { cn } from '@/lib/utils';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Skeleton } from '@/components/ui/skeleton';

interface KpiCardSkeletonProps {
  /** Si true, pinta también una línea de hint debajo del valor. Default: false. */
  withHint?: boolean;
  className?: string;
}

/**
 * Skeleton de un único `KpiCard`. Imita su estructura: icono `h-4 w-4`,
 * label `h-3`, valor grande `h-7` y hint opcional. Mantiene padding `p-4`
 * y altura aproximada del card real para que no haya "salto" al cargar.
 */
export function KpiCardSkeleton({ withHint, className }: KpiCardSkeletonProps) {
  return (
    <SurfaceCard className={cn('p-4', className)}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-7 w-20" />
          {withHint && <Skeleton className="h-3 w-32" />}
        </div>
      </div>
    </SurfaceCard>
  );
}

interface KpiCardsGridSkeletonProps {
  count?: number;
  /** Clases del grid. Default: `grid-cols-2 md:grid-cols-4`. */
  gridClassName?: string;
  withHint?: boolean;
}

/** Grid responsive de N skeleton cards. */
export function KpiCardsGridSkeleton({
  count = 4,
  gridClassName,
  withHint,
}: KpiCardsGridSkeletonProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 md:grid-cols-4',
        gridClassName,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <KpiCardSkeleton key={`kpi-skel-${i}`} withHint={withHint} />
      ))}
    </div>
  );
}
