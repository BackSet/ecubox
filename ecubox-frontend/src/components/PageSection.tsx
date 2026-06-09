import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageSectionProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Espacio entre el encabezado y el contenido. Por defecto 'md'. */
  gap?: 'sm' | 'md' | 'lg';
}

const GAP_CLASS: Record<NonNullable<PageSectionProps['gap']>, string> = {
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
};

/**
 * Agrupador semántico de contenido de página.
 * Más ligero que FormSection: no envuelve en SurfaceCard, solo provee
 * heading consistente + espaciado. Ideal para secciones de detalle,
 * configuración o cualquier bloque que agrupe varios sub-elementos.
 */
export function PageSection({
  title,
  description,
  actions,
  children,
  className,
  gap = 'md',
}: PageSectionProps) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <section className={cn('flex flex-col', GAP_CLASS[gap], className)}>
      {hasHeader && (
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          {(title || description) && (
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
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
        </header>
      )}
      {children}
    </section>
  );
}
