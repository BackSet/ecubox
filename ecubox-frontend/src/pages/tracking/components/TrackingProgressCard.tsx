import type { TrackingResponse } from '@/lib/api/tracking.service';

interface TrackingProgressCardProps {
  result: TrackingResponse;
  totalPasosBase: number;
  pasoBaseActual: number;
}

function clampPercentage(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function TrackingProgressCard({
  result,
  totalPasosBase,
  pasoBaseActual,
}: TrackingProgressCardProps) {
  const pasosCompletados = pasoBaseActual > 0 ? pasoBaseActual : 0;
  const progress = totalPasosBase > 0
    ? clampPercentage((pasosCompletados / totalPasosBase) * 100)
    : 0;

  const showDias =
    result.diasMaxRetiro != null &&
    (result.diasTranscurridos != null || result.diasRestantes != null);
  const periodoCumplido = result.diasRestantes === 0;

  return (
    <section className="surface-card p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
          Progreso y plazos
        </h3>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Flujo estimado según los estados configurados del envío.
        </p>
      </div>

      <div className="space-y-2">
        <div className="h-2 rounded-full bg-[var(--color-muted)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Paso base {pasosCompletados} de {totalPasosBase || 0}
        </p>
      </div>

      {showDias ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <p className="text-xs text-[var(--color-muted-foreground)]">Días transcurridos</p>
            <p className="text-lg font-semibold text-[var(--color-foreground)]">
              {result.diasTranscurridos ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Días restantes para retiro
            </p>
            <p className="text-lg font-semibold text-[var(--color-foreground)]">
              {result.diasRestantes ?? 0}
            </p>
          </div>
          {periodoCumplido ? (
            <p className="sm:col-span-2 text-sm font-medium text-[var(--color-foreground)]">
              El periodo de espera ya se cumplió.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Este envío no tiene un plazo máximo de retiro configurado.
        </p>
      )}
    </section>
  );
}

