import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PageErrorStateProps {
  title?: string;
  message: string;
  hint?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/**
 * Estado de error de página completa: bloque grande centrado para cuando
 * la carga inicial falla y no hay datos previos que mostrar.
 * Para errores no-bloqueantes sobre datos ya cargados usa InlineErrorBanner.
 */
export function PageErrorState({
  title = 'No se pudo cargar',
  message,
  hint,
  onRetry,
  retrying,
  className,
}: PageErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed',
        'border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5',
        'px-6 py-14 text-center',
        'ui-motion-fade',
        className,
      )}
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-destructive)]/10"
        aria-hidden
      >
        <AlertCircle className="h-6 w-6 text-[var(--color-destructive)]" strokeWidth={1.75} />
      </span>

      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-[var(--color-foreground)]">{title}</p>
        <p className="text-sm text-[var(--color-muted-foreground)]">{message}</p>
        {hint && (
          <p className="text-xs text-[var(--color-muted-foreground)]">{hint}</p>
        )}
      </div>

      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={retrying}
          className="gap-2"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', retrying && 'animate-spin')} />
          Reintentar
        </Button>
      )}
    </div>
  );
}
