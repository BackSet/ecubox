import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface DetailHeaderSkeletonProps {
  /** Cuántos badges/pills pintar a la derecha del título. Default: 3. */
  badges?: number;
  /** Cuántas filas de "meta" debajo del título. Default: 1. */
  metaLines?: number;
  /** Si true, pinta un placeholder de breadcrumb encima. Default: true. */
  withBreadcrumb?: boolean;
  className?: string;
}

/**
 * Skeleton del bloque cabecera de las páginas de detalle (Despacho,
 * Manifiesto, Lote, Envío, Guía, etc.). Pinta breadcrumb + título grande
 * + grupo de badges + meta opcional.
 */
export function DetailHeaderSkeleton({
  badges = 3,
  metaLines = 1,
  withBreadcrumb = true,
  className,
}: DetailHeaderSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {withBreadcrumb && <Skeleton className="h-3 w-40" />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-72 max-w-full" />
          {Array.from({ length: metaLines }).map((_, i) => (
            <Skeleton
              key={`meta-${i}`}
              className="h-3 w-56 max-w-full"
            />
          ))}
        </div>
        {badges > 0 && (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: badges }).map((_, i) => (
              <Skeleton
                key={`badge-${i}`}
                className="h-6 w-20 rounded-full"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
