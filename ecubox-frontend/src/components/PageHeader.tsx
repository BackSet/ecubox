import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SurfaceCard } from '@/components/ui/surface-card';

type PageHeaderVariant = 'list' | 'detail' | 'public';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
  variant?: PageHeaderVariant;
  className?: string;
  children?: ReactNode;
}

/**
 * Encabezado canonico de pagina/seccion.
 * - variant="list":   Tarjeta superior con titulo + acciones (listas y CRUD).
 * - variant="detail": Bloque ligero sin tarjeta para vistas de detalle.
 * - variant="public": Variante para paginas publicas (landing-card).
 */
export function PageHeader({
  title,
  description,
  icon,
  actions,
  breadcrumbs,
  variant = 'list',
  className,
  children,
}: PageHeaderProps) {
  const titleNode = (
    <div className="flex min-w-0 items-start gap-3">
      {icon && (
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {breadcrumbs && <div className="mb-1 text-xs text-[var(--color-muted-foreground)]">{breadcrumbs}</div>}
        <h1 className="truncate text-base font-semibold tracking-tight text-[var(--color-foreground)] sm:text-lg">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">{description}</p>
        )}
      </div>
    </div>
  );

  const actionsNode = actions ? (
    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">{actions}</div>
  ) : null;

  if (variant === 'detail') {
    return (
      <div
        className={cn(
          'flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between',
          className,
        )}
      >
        {titleNode}
        {actionsNode}
        {children}
      </div>
    );
  }

  if (variant === 'public') {
    return (
      <div
        className={cn(
          'landing-card flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between',
          className,
        )}
      >
        {titleNode}
        {actionsNode}
        {children}
      </div>
    );
  }

  return (
    <SurfaceCard
      className={cn(
        'flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between',
        className,
      )}
    >
      {titleNode}
      {actionsNode}
      {children}
    </SurfaceCard>
  );
}
