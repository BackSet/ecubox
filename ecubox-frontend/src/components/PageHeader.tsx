import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
 * - variant="list":   Bloque plano superior con titulo + acciones (listas y CRUD).
 * - variant="detail": Bloque ligero sin separador inferior para vistas de detalle.
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
    <div className="flex min-w-0 items-start gap-2.5">
      {icon && (
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[var(--color-muted-foreground)]">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {breadcrumbs && (
          <div className="mb-1 text-[12px] text-[var(--color-muted-foreground)]">
            {breadcrumbs}
          </div>
        )}
        <h1 className="truncate text-[18px] font-semibold leading-tight tracking-tight text-[var(--color-foreground)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted-foreground)]">
            {description}
          </p>
        )}
      </div>
    </div>
  );

  const actionsNode = actions ? (
    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
      {actions}
    </div>
  ) : null;

  if (variant === 'detail') {
    return (
      <div
        className={cn(
          'flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between',
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
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-[var(--color-border)] pb-4 lg:flex-row lg:items-start lg:justify-between',
        className,
      )}
    >
      {titleNode}
      {actionsNode}
      {children}
    </div>
  );
}
