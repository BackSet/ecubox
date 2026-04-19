import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface KeyValueGridSkeletonProps {
  /** Cuántas filas label/value pintar. Default: 6. */
  rows?: number;
  /** Cuántas columnas en el grid. Default: 2. */
  cols?: 1 | 2 | 3;
  className?: string;
}

const COL_CLASS: Record<1 | 2 | 3, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

/**
 * Skeleton para grids label/value típicos de "resumen" en páginas de
 * detalle (Despacho, Manifiesto, Lote, EnvioConsolidado, etc.).
 * Cada celda pinta un label corto y un value un poco más ancho.
 */
export function KeyValueGridSkeleton({
  rows = 6,
  cols = 2,
  className,
}: KeyValueGridSkeletonProps) {
  return (
    <div className={cn('grid gap-x-6 gap-y-4', COL_CLASS[cols], className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={`kv-${i}`} className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-32 max-w-full" />
        </div>
      ))}
    </div>
  );
}
