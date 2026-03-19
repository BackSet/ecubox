import { Badge } from '@/components/ui/badge';
import type { TrackingResponse } from '@/lib/api/tracking.service';

interface TrackingSummaryCardProps {
  result: TrackingResponse;
  fechaFormateada: string | null;
}

export function TrackingSummaryCard({
  result,
  fechaFormateada,
}: TrackingSummaryCardProps) {
  return (
    <section className="surface-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Envío
          </p>
          <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
            {result.numeroGuia}
          </h2>
          {fechaFormateada ? (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Estado actualizado el {fechaFormateada}
            </p>
          ) : null}
        </div>
        <Badge variant="secondary">
          {result.estadoRastreoNombre ?? result.estadoRastreoId ?? 'Estado no disponible'}
        </Badge>
      </div>
      {result.flujoActual === 'ALTERNO' && (
        <div className="rounded-lg border border-[var(--color-warning)]/50 bg-[var(--color-warning)]/10 p-3">
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            Envío en flujo alterno por incidencia operativa
          </p>
          {result.motivoAlterno ? (
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1">{result.motivoAlterno}</p>
          ) : null}
        </div>
      )}

      {result.leyenda ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-3">
          <p className="text-sm text-[var(--color-foreground)] leading-relaxed">
            {result.leyenda}
          </p>
        </div>
      ) : null}
    </section>
  );
}

