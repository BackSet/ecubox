import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface TextBlockSkeletonProps {
  /** Cuántas líneas de texto pintar. Default: 5. */
  rows?: number;
  className?: string;
}

/**
 * Bloque de "párrafo" con líneas de longitud variable. La última línea
 * siempre se acorta para simular un párrafo natural.
 */
export function TextBlockSkeleton({ rows = 5, className }: TextBlockSkeletonProps) {
  const widths = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-8/12'];
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, i) => {
        const isLast = i === rows - 1;
        const width = isLast ? 'w-1/3' : widths[i % widths.length];
        return (
          <Skeleton
            key={`text-line-${i}`}
            className={cn('h-3.5', width)}
          />
        );
      })}
    </div>
  );
}
