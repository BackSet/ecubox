import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface InlineErrorBannerProps {
  /** Mensaje breve que se muestra al usuario. */
  message: string;
  /** Texto opcional en línea con detalle adicional (ej. servidor caído). */
  hint?: string;
  /** Si se provee, se renderiza un botón "Reintentar" que ejecuta el callback. */
  onRetry?: () => void;
  /** Indica que un retry está en curso para deshabilitar el botón. */
  retrying?: boolean;
  className?: string;
}

/**
 * Banner de error compacto pensado para mostrarse ENCIMA de los datos previos
 * en listados con paginación + búsqueda. A diferencia del bloque grande que se
 * mostraba antes, este permite que el usuario siga viendo (y operando sobre)
 * los resultados anteriores mientras la query reintenta en segundo plano.
 */
export function InlineErrorBanner({
  message,
  hint,
  onRetry,
  retrying,
  className,
}: InlineErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-2 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 px-3 py-2 text-[13px] text-[var(--color-destructive)] sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
        <div className="min-w-0">
          <p className="font-medium">{message}</p>
          {hint && (
            <p className="text-[12px] text-[var(--color-destructive)]/80">{hint}</p>
          )}
        </div>
      </div>
      {onRetry && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRetry}
          disabled={retrying}
          className="shrink-0"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', retrying && 'animate-spin')} />
          Reintentar
        </Button>
      )}
    </div>
  );
}
