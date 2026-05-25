import { HelpCircle } from 'lucide-react';
import { PublicContactLinks } from '@/components/public/PublicContactLinks';
import { usePublicCanalesDisponibles } from '@/hooks/useCanalesComunicacion';

export function PublicAuthHelpBlock() {
  const { hasCanales, canales, isLoading, isError } = usePublicCanalesDisponibles();

  if (isLoading || isError || !hasCanales || !canales) {
    return null;
  }

  return (
    <div className="landing-card space-y-3 p-4">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <HelpCircle className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold landing-text">¿Necesitas ayuda?</p>
          <p className="text-xs landing-text-muted">Escríbenos antes de crear tu cuenta.</p>
        </div>
      </div>
      <PublicContactLinks canales={canales} variant="compact" />
    </div>
  );
}


