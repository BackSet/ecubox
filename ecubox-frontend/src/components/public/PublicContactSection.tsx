import type { ReactNode } from 'react';
import { SurfaceCard } from '@/components/ui/surface-card';
import { PublicContactLinks } from '@/components/public/PublicContactLinks';
import { usePublicCanalesDisponibles } from '@/hooks/useCanalesComunicacion';
import { cn } from '@/lib/utils';

export interface PublicContactSectionProps {
  title?: string;
  description?: string;
  variant?: 'footer' | 'inline' | 'compact';
  /** Envuelve en SurfaceCard (p. ej. casillero). */
  asCard?: boolean;
  className?: string;
  cardClassName?: string;
  children?: ReactNode;
}

/**
 * Bloque de contacto/redes: solo se renderiza si hay al menos un canal público configurado.
 */
export function PublicContactSection({
  title,
  description,
  variant = 'inline',
  asCard = false,
  className,
  cardClassName,
  children,
}: PublicContactSectionProps) {
  const { hasCanales, canales, isLoading, isError } = usePublicCanalesDisponibles();

  if (isLoading || isError || !hasCanales || !canales) {
    return null;
  }

  const body = (
    <>
      {title ? (
        <h2 className="text-sm font-semibold text-[var(--color-foreground)]">{title}</h2>
      ) : null}
      {description ? (
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{description}</p>
      ) : null}
      <div className={cn(title || description ? 'mt-4' : undefined)}>
        <PublicContactLinks canales={canales} variant={variant} />
      </div>
      {children}
    </>
  );

  if (asCard) {
    return (
      <SurfaceCard
        className={cn(
          'overflow-hidden p-0 ring-1 ring-[var(--color-border)]/50',
          cardClassName,
          className,
        )}
      >
        <div className="border-b border-[var(--color-border)]/60 bg-[var(--color-muted)]/20 px-4 py-3.5 sm:px-5">
          {title ? (
            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">{title}</h2>
          ) : null}
          {description ? (
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{description}</p>
          ) : null}
        </div>
        <div className="px-4 py-5 sm:px-5 sm:py-6">
          <PublicContactLinks canales={canales} variant={variant} />
          {children}
        </div>
      </SurfaceCard>
    );
  }

  return <div className={className}>{body}</div>;
}

