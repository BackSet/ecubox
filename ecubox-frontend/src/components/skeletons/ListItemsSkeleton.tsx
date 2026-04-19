import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ListItemsSkeletonProps {
  /** Cuántos items pintar. Default: 5. */
  rows?: number;
  /** Si true, incluye un avatar/icono cuadrado a la izquierda. Default: true. */
  withIcon?: boolean;
  /** Cuántas líneas de texto por item (1 o 2). Default: 2. */
  lines?: 1 | 2;
  /** Si true, pinta un placeholder de meta a la derecha (timestamp/badge). */
  withTrailing?: boolean;
  className?: string;
}

/**
 * Skeleton para listas no tabulares: historiales, listas dentro de
 * diálogos, paneles WhatsApp, etc. Cada item es una fila con icono +
 * 1-2 líneas + meta opcional al final.
 */
export function ListItemsSkeleton({
  rows = 5,
  withIcon = true,
  lines = 2,
  withTrailing = false,
  className,
}: ListItemsSkeletonProps) {
  return (
    <ul className={cn('divide-y divide-[var(--color-border)]', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={`list-skel-${i}`}
          className="flex items-start gap-3 px-3 py-3"
        >
          {withIcon && (
            <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            {lines === 2 && <Skeleton className="h-3 w-1/2" />}
          </div>
          {withTrailing && (
            <Skeleton className="h-3 w-16 shrink-0" />
          )}
        </li>
      ))}
    </ul>
  );
}
