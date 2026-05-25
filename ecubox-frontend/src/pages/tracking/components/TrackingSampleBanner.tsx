import { Link } from '@tanstack/react-router';
import { FlaskConical, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TrackingSampleBanner({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-[var(--color-warning)]/45 bg-[var(--color-warning)]/10 p-4 sm:flex-row sm:items-start sm:gap-4',
        className
      )}
    >
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-warning)]/20 text-[var(--color-warning)]">
        <FlaskConical className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-semibold text-[var(--color-foreground)]">
          Vista de demostración con datos ficticios
        </p>
        <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          Los códigos, nombres y estados que ves aquí son solo un ejemplo para mostrar cómo
          funciona el rastreo público. No corresponden a envíos reales de ECUBOX.
        </p>
        <Link
          to="/tracking"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] transition-colors hover:underline"
        >
          Consultar un envío real
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
