import { cn } from '@/lib/utils';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCardsGrid, KPI_CARDS_GRID_CLASS } from '@/components/KpiCardsGrid';

interface KpiCardSkeletonProps {
  /** @deprecated El hint siempre se reserva; se mantiene por compatibilidad. */
  withHint?: boolean;
  className?: string;
}

/**
 * Skeleton de un único `KpiCard`. Imita su estructura: badge de icono,
 * label, valor grande y hint reservado. Mantiene `h-full` para grids uniformes.
 */
export function KpiCardSkeleton({ className }: KpiCardSkeletonProps) {
  return (
    <SurfaceCard className={cn('h-full min-h-[7.5rem] p-4', className)}>
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
            <Skeleton className="h-4 w-28 flex-1" />
          </div>
        </div>
        <div className="mt-auto min-w-0 space-y-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="min-h-[2.5rem] h-3 w-32" />
        </div>
      </div>
    </SurfaceCard>
  );
}

interface KpiCardsGridSkeletonProps {
  count?: number;
  /** Clases adicionales del grid. Por defecto usa `KPI_CARDS_GRID_CLASS`. */
  gridClassName?: string;
  /** @deprecated El hint siempre se reserva; se mantiene por compatibilidad. */
  withHint?: boolean;
}

/** Grid responsive de N skeleton cards. */
export function KpiCardsGridSkeleton({
  count = 4,
  gridClassName,
}: KpiCardsGridSkeletonProps) {
  return (
    <KpiCardsGrid className={gridClassName}>
      {Array.from({ length: count }).map((_, i) => (
        <KpiCardSkeleton key={`kpi-skel-${i}`} />
      ))}
    </KpiCardsGrid>
  );
}

export { KPI_CARDS_GRID_CLASS };

