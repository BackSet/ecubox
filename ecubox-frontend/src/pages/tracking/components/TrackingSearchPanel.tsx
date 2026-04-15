import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TrackingSearchPanelProps {
  numeroGuia: string;
  loading: boolean;
  validationError?: string | null;
  onNumeroGuiaChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function TrackingSearchPanel({
  numeroGuia,
  loading,
  validationError,
  onNumeroGuiaChange,
  onSubmit,
}: TrackingSearchPanelProps) {
  return (
    <section className="surface-card p-5 sm:p-6 space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
          Consultar tu envío
        </h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Ingresa el número de guía para ver el estado, el avance y los datos de entrega.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3.5">
        <div className="space-y-2">
          <label htmlFor="numeroGuia" className="text-sm font-medium text-[var(--color-foreground)]">
            Número de guía
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5">
            <Input
              id="numeroGuia"
              type="text"
              value={numeroGuia}
              onChange={(e) => onNumeroGuiaChange(e.target.value)}
              placeholder="Ej: PAQUETE-12345"
              className="input-clean h-11 px-4"
              disabled={loading}
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? 'tracking-guia-error' : 'tracking-guia-help'}
            />
            <Button type="submit" className="h-11 sm:px-5" disabled={loading}>
              {loading ? (
                'Buscando...'
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Consultar seguimiento
                </>
              )}
            </Button>
          </div>
        </div>
        <p id="tracking-guia-help" className="text-xs text-[var(--color-muted-foreground)]">
          Puedes usar letras, números y caracteres especiales. Evita espacios.
        </p>
        {validationError ? (
          <p id="tracking-guia-error" className="text-sm text-[var(--color-destructive)]" role="alert">
            {validationError}
          </p>
        ) : null}
      </form>
    </section>
  );
}

