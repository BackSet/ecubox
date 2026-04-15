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
  const diasAtrasoRetiro =
    result.diasMaxRetiro != null && result.diasTranscurridos != null
      ? Math.max(0, result.diasTranscurridos - result.diasMaxRetiro)
      : 0;
  const periodoVencido = Boolean(result.paqueteVencido) || diasAtrasoRetiro > 0;
  const periodoCumplido = !periodoVencido && result.diasRestantes === 0;
  const periodoEnRango = !periodoVencido && (result.diasRestantes ?? 0) > 0;

  return (
    <section className="surface-card p-5 sm:p-6 space-y-5">
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          Avance y tiempos
        </h3>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Este avance es una referencia según las etapas de tu envío.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            Paso {pasosCompletados} de {totalPasosBase || 0}
          </p>
          <p className="text-sm font-semibold text-[var(--color-primary)]">{Math.round(progress)}%</p>
        </div>
        <div className="h-2.5 rounded-full bg-[var(--color-muted)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          El porcentaje considera solo las etapas principales del envío.
        </p>
      </div>

      {showDias ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-4 py-3.5">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Días transcurridos</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--color-foreground)]">
              {result.diasTranscurridos ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-4 py-3.5">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Días restantes para retiro
            </p>
            <p className="mt-1 text-2xl font-semibold text-[var(--color-foreground)]">
              {result.diasRestantes ?? 0}
            </p>
          </div>
          {periodoVencido ? (
            <p className="sm:col-span-2 rounded-lg border border-[var(--color-destructive)]/35 bg-[var(--color-destructive)]/12 px-4 py-3 text-sm font-medium text-[var(--color-destructive)]">
              El plazo para retirar tu envío venció hace {diasAtrasoRetiro} día(s).
            </p>
          ) : null}
          {periodoEnRango ? (
            <p className="sm:col-span-2 rounded-lg border border-[var(--color-info)]/35 bg-[var(--color-info)]/12 px-4 py-3 text-sm font-medium text-[var(--color-foreground)]">
              Puedes retirar tu envío en los próximos {result.diasRestantes ?? 0} día(s).
            </p>
          ) : null}
          {periodoCumplido ? (
            <p className="sm:col-span-2 rounded-lg border border-[var(--color-success)]/35 bg-[var(--color-success)]/12 px-4 py-3 text-sm font-medium text-[var(--color-foreground)]">
              Hoy es el último día para retirar tu envío.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
          No contamos con un plazo de retiro para este envío por el momento.
        </p>
      )}
    </section>
  );
}

