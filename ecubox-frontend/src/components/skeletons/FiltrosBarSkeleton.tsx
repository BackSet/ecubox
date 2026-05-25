import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SurfaceCard } from '@/components/ui/surface-card';
import { FILTROS_GRID_CLASS } from '@/components/FiltrosBar';

interface FiltrosBarSkeletonProps {
  chips?: number;
  filters?: number;
  className?: string;
}

export function FiltrosBarSkeleton({
  chips = 4,
  filters = 2,
  className,
}: FiltrosBarSkeletonProps) {
  return (
    <SurfaceCard className={cn('overflow-hidden p-0', className)}>
      {chips > 0 && (
        <div
          className={cn(
            'px-3 py-3',
            filters > 0 && 'border-b border-[var(--color-border)]',
          )}
        >
          <div
            className={cn(
              'flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]',
              'md:flex-wrap md:overflow-x-visible',
            )}
          >
            {Array.from({ length: chips }).map((_, i) => (
              <Skeleton key={`chip-${i}`} className="h-9 w-28 shrink-0 rounded-full" />
            ))}
          </div>
        </div>
      )}
      {filters > 0 && (
        <div className="px-3 py-3">
          <div className="mb-3 flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded-sm" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className={FILTROS_GRID_CLASS}>
            {Array.from({ length: filters }).map((_, i) => (
              <div key={`filter-${i}`} className="flex min-w-0 flex-col gap-1.5">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}
