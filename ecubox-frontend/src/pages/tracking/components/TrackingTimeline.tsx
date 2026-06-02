import { Check, Circle, CircleDot, Route } from 'lucide-react';
import type { TrackingEstadoItem } from '@/lib/api/tracking.service';

interface TrackingTimelineProps {
  estados: TrackingEstadoItem[];
  currentIndex: number;
}

function formatOcurrencia(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TrackingTimeline({ estados, currentIndex }: TrackingTimelineProps) {
  if (estados.length === 0) {
    return (
      <section className="surface-card p-5 sm:p-6">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          Recorrido del envío
        </h3>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          Aún no tenemos novedades para mostrar en el recorrido de tu envío.
        </p>
      </section>
    );
  }

  let baseStepCounter = 0;
  const baseStepByEstadoId = new Map<number, number>();
  for (const estado of estados) {
    if (estado.tipoFlujo === 'ALTERNO') continue;
    baseStepCounter += 1;
    baseStepByEstadoId.set(estado.id, baseStepCounter);
  }

  return (
    <section className="surface-card p-5 sm:p-6">
      <h3 className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-foreground)]">
        <Route className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        Recorrido del envío
      </h3>
      <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
        Cada etapa por la que pasa tu envío. La marcada como "Actual" es donde se
        encuentra ahora.
      </p>

      <ul className="relative mt-5 space-y-0" role="list">
        {estados.map((item, index) => {
          const isLast = index === estados.length - 1;
          const isCompleted = !item.esActual && currentIndex >= 0 && index < currentIndex;
          const isAlterno = item.tipoFlujo === 'ALTERNO';

          return (
            <li key={item.id} className="relative flex gap-3.5 pb-5 last:pb-0">
              {!isLast ? (
                <span
                  className="absolute left-[13px] top-7 bottom-0 w-0.5 bg-[var(--color-border)]"
                  aria-hidden
                />
              ) : null}
              <span
                className={`
                  relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2
                  ${item.esActual
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] ring-4 ring-[var(--color-primary)]/15'
                    : isCompleted
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                      : 'border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted-foreground)]'}
                `}
                aria-hidden
              >
                {item.esActual ? (
                  <CircleDot className="h-4 w-4" />
                ) : isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
              </span>
              <div
                className={`flex-1 min-w-0 rounded-lg border px-3.5 py-3 transition-colors ${
                  item.esActual
                    ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/[0.06]'
                    : 'border-[var(--color-border)] bg-[var(--color-muted)]/20'
                }`}
              >
                <div className="flex items-center gap-2.5 flex-wrap">
                  {isAlterno ? (
                    <span className="rounded border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                      Aviso
                    </span>
                  ) : (
                    <span className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted-foreground)]">
                      Paso {baseStepByEstadoId.get(item.id) ?? item.orden}
                    </span>
                  )}
                  <span
                    className={
                      item.esActual
                        ? 'text-sm font-semibold text-[var(--color-foreground)]'
                        : isCompleted
                          ? 'text-sm text-[var(--color-foreground)]'
                          : 'text-sm text-[var(--color-muted-foreground)]'
                    }
                  >
                    {item.nombre}
                  </span>
                  {item.esActual ? (
                    <span
                      className="rounded bg-[var(--color-primary)]/15 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]"
                      aria-label="Estado actual"
                    >
                      Actual
                    </span>
                  ) : null}
                </div>
                {(() => {
                  const fecha = formatOcurrencia(item.fechaOcurrencia);
                  if (fecha) {
                    return (
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{fecha}</p>
                    );
                  }
                  if (!isCompleted && !item.esActual) {
                    return (
                      <p className="mt-1 text-xs italic text-[var(--color-muted-foreground)]/70">
                        Pendiente
                      </p>
                    );
                  }
                  return null;
                })()}
                {item.leyenda ? (
                  <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                    {item.leyenda}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
