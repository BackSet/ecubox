import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { SurfaceCard } from '@/components/ui/surface-card';

type PageCardPadding = 'default' | 'compact' | 'none';

interface PageCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  padding?: PageCardPadding;
}

const CARD_PADDING: Record<PageCardPadding, string> = {
  default: 'p-4 sm:p-5',
  compact: 'p-3 sm:p-4',
  none: 'p-0',
};

/**
 * Cuando el card no tiene padding (tablas, imágenes que van de borde a borde)
 * el header necesita su propio padding para no quedar pegado al borde.
 */
const HEADER_PADDING: Record<PageCardPadding, string> = {
  default: '',
  compact: '',
  none: 'p-4 sm:p-5',
};

/**
 * SurfaceCard con padding estándar + header opcional (título / descripción / acciones).
 * Cubre el patrón repetido de <SurfaceCard className="p-4 sm:p-5"> con heading
 * manual. Para secciones de formulario usa FormSection en su lugar.
 */
export function PageCard({
  title,
  description,
  actions,
  padding = 'default',
  className,
  children,
  ...props
}: PageCardProps) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <SurfaceCard className={cn(CARD_PADDING[padding], className)} {...props}>
      {hasHeader && (
        <div
          className={cn(
            'flex flex-col gap-2 border-b border-[var(--color-border)] pb-3 sm:flex-row sm:items-start sm:justify-between',
            padding === 'none' ? 'mb-0' : 'mb-4',
            HEADER_PADDING[padding],
          )}
        >
          {(title || description) && (
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="text-sm font-semibold tracking-tight text-[var(--color-foreground)] sm:text-base">
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
                  {description}
                </p>
              )}
            </div>
          )}
          {actions && (
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </SurfaceCard>
  );
}
