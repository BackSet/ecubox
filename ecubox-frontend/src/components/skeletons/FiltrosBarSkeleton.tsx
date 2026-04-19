import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface FiltrosBarSkeletonProps {
  /** Cuántos chips pintar arriba. Default: 4. */
  chips?: number;
  /** Cuántos selectores/inputs de filtro pintar. Default: 2. */
  filters?: number;
  className?: string;
}

/**
 * Skeleton para `FiltrosBar`: una fila de chips y otra de selectores.
 * Usado en listas con filtros (paquetes, manifiestos, despachos, etc.).
 */
export function FiltrosBarSkeleton({
  chips = 4,
  filters = 2,
  className,
}: FiltrosBarSkeletonProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3',
        className,
      )}
    >
      {chips > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: chips }).map((_, i) => (
            <Skeleton
              key={`chip-${i}`}
              className="h-7 w-24 rounded-full"
            />
          ))}
        </div>
      )}
      {filters > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: filters }).map((_, i) => (
            <Skeleton key={`filter-${i}`} className="h-9 w-44" />
          ))}
        </div>
      )}
    </div>
  );
}
