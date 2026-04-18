import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SurfaceCard } from '@/components/ui/surface-card';

interface FormSectionProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * Bloque canonico para agrupar campos de formulario.
 * Estructura: SurfaceCard + cabecera (titulo/descripcion + acciones opcionales) + body con espaciado consistente.
 */
export function FormSection({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: FormSectionProps) {
  return (
    <SurfaceCard className={cn('p-4 sm:p-5', className)}>
      {(title || description || actions) && (
        <header className="mb-4 flex flex-col gap-2 border-b border-[var(--color-border)] pb-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
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
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('flex flex-col gap-4', bodyClassName)}>{children}</div>
    </SurfaceCard>
  );
}
