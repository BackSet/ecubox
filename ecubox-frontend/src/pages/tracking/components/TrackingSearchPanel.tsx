import { Loader2, Package, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TrackingSearchPanelProps {
  numeroGuia: string;
  loading: boolean;
  validationError?: string | null;
  onNumeroGuiaChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const EJEMPLOS: string[] = ['ABC1234567890', 'ABC1234567890 1/2', 'XYZ-987654321'];

export function TrackingSearchPanel({
  numeroGuia,
  loading,
  validationError,
  onNumeroGuiaChange,
  onSubmit,
}: TrackingSearchPanelProps) {
  const hasValor = numeroGuia.trim().length > 0;

  return (
    <section className="surface-card space-y-4 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] sm:inline-flex">
          <Search className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            Consultar tu envío
          </h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Ingresa el número de guía o de pieza para ver el estado, el avance y los
            datos de entrega.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3.5">
        <label htmlFor="numeroGuia" className="sr-only">
          Número de guía
        </label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Package
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
              style={{ width: 16, height: 16 }}
              aria-hidden
            />
            <Input
              id="numeroGuia"
              type="text"
              value={numeroGuia}
              onChange={(e) => onNumeroGuiaChange(e.target.value)}
              placeholder="Ej: ABC1234567890 ó ABC1234567890 1/2"
              className="h-11 pl-9 pr-9 font-mono text-sm tracking-wide"
              disabled={loading}
              autoComplete="off"
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? 'tracking-guia-error' : 'tracking-guia-help'}
            />
            {hasValor && !loading && (
              <button
                type="button"
                onClick={() => onNumeroGuiaChange('')}
                className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                aria-label="Limpiar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button type="submit" className="h-11 sm:px-5" disabled={loading || !hasValor}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Consultar
              </>
            )}
          </Button>
        </div>

        {validationError ? (
          <p
            id="tracking-guia-error"
            className="text-sm text-[var(--color-destructive)]"
            role="alert"
          >
            {validationError}
          </p>
        ) : (
          <div
            id="tracking-guia-help"
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-muted-foreground)]"
          >
            <span>Ejemplos:</span>
            {EJEMPLOS.map((ej) => (
              <button
                key={ej}
                type="button"
                disabled={loading}
                onClick={() => onNumeroGuiaChange(ej)}
                className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/50 px-2 py-0.5 font-mono text-[11px] text-[var(--color-foreground)] transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ej}
              </button>
            ))}
          </div>
        )}
      </form>
    </section>
  );
}
