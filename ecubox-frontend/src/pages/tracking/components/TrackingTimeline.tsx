import { Check, Circle, CircleDot } from 'lucide-react';
import type { TrackingEstadoItem } from '@/lib/api/tracking.service';

interface TrackingTimelineProps {
  estados: TrackingEstadoItem[];
  currentIndex: number;
}

export function TrackingTimeline({ estados, currentIndex }: TrackingTimelineProps) {
  if (estados.length === 0) {
    return (
      <section className="surface-card p-5">
        <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
          Flujo del envío
        </h3>
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          No hay estados configurados para mostrar el flujo.
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
    <section className="surface-card p-5">
      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
        Flujo del envío
      </h3>
      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
        Secuencia real del paquete. Las novedades informativas se muestran solo cuando aplican.
      </p>

      <ul className="relative mt-4 space-y-0" role="list">
        {estados.map((item, index) => {
          const isLast = index === estados.length - 1;
          const isCompleted = !item.esActual && currentIndex >= 0 && index < currentIndex;
          const isAlterno = item.tipoFlujo === 'ALTERNO';

          return (
            <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
              {!isLast ? (
                <span
                  className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-[var(--color-border)]"
                  aria-hidden
                />
              ) : null}
              <span
                className={`
                  relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2
                  ${item.esActual
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                    : isCompleted
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                      : 'border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted-foreground)]'}
                `}
                aria-hidden
              >
                {item.esActual ? (
                  <CircleDot className="h-3.5 w-3.5" />
                ) : isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </span>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {isAlterno ? (
                    <span className="rounded border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
                      Novedad informativa
                    </span>
                  ) : (
                    <span className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)]">
                      Base {baseStepByEstadoId.get(item.id) ?? item.orden}
                    </span>
                  )}
                  <span
                    className={
                      item.esActual
                        ? 'font-semibold text-[var(--color-foreground)]'
                        : isCompleted
                          ? 'text-[var(--color-foreground)]'
                          : 'text-[var(--color-muted-foreground)]'
                    }
                  >
                    {item.nombre}
                  </span>
                  {item.esActual ? (
                    <span
                      className="rounded px-1.5 py-0.5 text-xs font-medium bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                      aria-label="Estado actual"
                    >
                      Actual
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

