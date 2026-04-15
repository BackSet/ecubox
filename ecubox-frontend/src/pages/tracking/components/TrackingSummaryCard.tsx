import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { TrackingResponse } from '@/lib/api/tracking.service';

interface TrackingSummaryCardProps {
  result: TrackingResponse;
  fechaFormateada: string | null;
}

export function TrackingSummaryCard({
  result,
  fechaFormateada,
}: TrackingSummaryCardProps) {
  const estadoTexto = result.estadoRastreoNombre ?? 'Estado no disponible';
  const estadoVariant = result.flujoActual === 'ALTERNO' ? 'pending' : 'in-progress';
  const diasAtrasoRetiro =
    result.diasMaxRetiro != null && result.diasTranscurridos != null
      ? Math.max(0, result.diasTranscurridos - result.diasMaxRetiro)
      : 0;
  const diasRestantes = result.diasRestantes ?? null;

  return (
    <section className="surface-card p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Guía consultada
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
            {result.numeroGuia}
          </h2>
          {fechaFormateada ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Estado actualizado el {fechaFormateada}
            </p>
          ) : null}
        </div>
        <StatusBadge variant={estadoVariant}>{estadoTexto}</StatusBadge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/25 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Estado del envío
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">{estadoTexto}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/25 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Tipo de seguimiento
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
            {result.flujoActual === 'ALTERNO' ? 'Seguimiento especial por una incidencia' : 'Seguimiento habitual'}
          </p>
        </div>
      </div>
      {result.flujoActual === 'ALTERNO' && (
        <div className="rounded-lg border border-[var(--color-warning)]/50 bg-[var(--color-warning)]/12 p-4">
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            Tu envío tiene un seguimiento especial por una incidencia
          </p>
          {result.motivoAlterno ? (
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{result.motivoAlterno}</p>
          ) : null}
        </div>
      )}

      {result.leyenda ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-4 py-3.5">
          <Badge variant="outline" className="mb-2">
            Información del estado actual
          </Badge>
          <p className="text-sm text-[var(--color-foreground)] leading-relaxed">
            {result.leyenda}
          </p>
          {result.paqueteVencido ? (
            <p className="mt-2 rounded-md border border-[var(--color-destructive)]/35 bg-[var(--color-destructive)]/10 px-3 py-2 text-sm font-medium text-[var(--color-destructive)]">
              El plazo para retirar tu envío venció hace {diasAtrasoRetiro} día(s).
            </p>
          ) : diasRestantes != null && diasRestantes > 0 ? (
            <p className="mt-2 rounded-md border border-[var(--color-info)]/35 bg-[var(--color-info)]/10 px-3 py-2 text-sm font-medium text-[var(--color-foreground)]">
              Puedes retirar tu envío en los próximos {diasRestantes} día(s).
            </p>
          ) : diasRestantes === 0 ? (
            <p className="mt-2 rounded-md border border-[var(--color-success)]/35 bg-[var(--color-success)]/10 px-3 py-2 text-sm font-medium text-[var(--color-foreground)]">
              Hoy es el último día para retirar tu envío.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

