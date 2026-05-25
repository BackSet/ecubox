import { HelpCircle } from 'lucide-react';
import { PublicContactLinks } from '@/components/public/PublicContactLinks';
import { usePublicCanalesDisponibles } from '@/hooks/useCanalesComunicacion';
import { cn } from '@/lib/utils';

export interface PublicSupportStripProps {
  className?: string;
  message?: string;
}

export function PublicSupportStrip({
  className,
  message = '¿Necesitas ayuda?',
}: PublicSupportStripProps) {
  const { hasCanales, canales, isLoading, isError } = usePublicCanalesDisponibles();

  if (isLoading || isError || !hasCanales || !canales) {
    return null;
  }

  return (
    <div
      className={cn(
        'landing-card-muted flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <HelpCircle className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold landing-text">{message}</p>
          <p className="text-xs landing-text-muted">Contáctanos por el canal que prefieras.</p>
        </div>
      </div>
      <PublicContactLinks canales={canales} variant="compact" />
    </div>
  );
}



