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
 * Layout alineado con `FiltrosBar`: chips con scroll en móvil; filtros en grid.
 */
export function FiltrosBarSkeleton({
  chips = 4,
  filters = 2,
  className,
}: FiltrosBarSkeletonProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card p-3',
        className,
      )}
    >
      {chips > 0 && (
        <div
          className={cn(
            '-mx-0.5 flex flex-nowrap items-center gap-2 overflow-x-auto px-0.5 pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]',
            'md:flex-wrap md:overflow-x-visible',
          )}
        >
          {Array.from({ length: chips }).map((_, i) => (
            <Skeleton
              key={`chip-${i}`}
              className="h-7 w-24 shrink-0 rounded-full"
            />
          ))}
        </div>
      )}
      {filters > 0 && (
        <div
          className={cn(
            chips > 0 && 'border-t border-border pt-3',
            'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end xl:flex xl:flex-wrap xl:items-end xl:gap-3',
          )}
        >
          {Array.from({ length: filters }).map((_, i) => (
            <div key={`filter-${i}`} className="flex min-w-0 flex-col gap-1">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-9 w-full rounded-md xl:max-w-[14rem]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
