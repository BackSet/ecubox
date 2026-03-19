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
    <section className="surface-card p-5 space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">
          Consultar tu envío
        </h2>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Ingresa tu número de guía para revisar el estado y los detalles de seguimiento.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <label htmlFor="numeroGuia" className="sr-only">
          Número de guía
        </label>
        <Input
          id="numeroGuia"
          type="text"
          value={numeroGuia}
          onChange={(e) => onNumeroGuiaChange(e.target.value)}
          placeholder="Ej: PAQUETE123"
          className="input-clean px-4 py-3"
          disabled={loading}
          aria-invalid={Boolean(validationError)}
        />
        {validationError ? (
          <p className="text-xs text-[var(--color-destructive)]" role="alert">
            {validationError}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            'Buscando...'
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Consultar tracking
            </>
          )}
        </Button>
      </form>
    </section>
  );
}

