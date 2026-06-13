import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Progreso de piezas de una guía: registradas → recibidas → despachadas sobre el
 * total esperado. Componente único y rediseñado que reemplaza las variantes que
 * vivían duplicadas en listas, detalles y tracking.
 *
 * El dato es un "embudo" (despachadas ⊆ recibidas ⊆ registradas ⊆ total), por eso
 * la barra apila tres rellenos anidados que dan sensación de avance.
 */

export interface PiezasProgressLabels {
  registradas: string;
  recibidas: string;
  despachadas: string;
}

const DEFAULT_LABELS: PiezasProgressLabels = {
  registradas: 'Registradas',
  recibidas: 'Recibidas',
  despachadas: 'Despachadas',
};

type Size = 'sm' | 'md';
type HeadingMode = 'count' | 'progress' | 'none';

export interface PiezasProgressProps {
  total: number | null | undefined;
  registradas: number;
  recibidas: number;
  despachadas: number;
  /** `sm` para celdas/listas, `md` para paneles de detalle. */
  size?: Size;
  /** Etiquetas de cada segmento (por defecto: internas del operador). */
  labels?: Partial<PiezasProgressLabels>;
  /**
   * `count`    → encabezado "{registradas} / {total} piezas" + pastilla de avance.
   * `progress` → encabezado con título a la izquierda y "{despachadas} de {total} {verbo}".
   * `none`     → sin encabezado (solo barra + leyenda); útil si el contenedor ya
   *              muestra su propio título/porcentaje.
   */
  headingMode?: HeadingMode;
  /** Título del encabezado en modo `progress`. */
  heading?: string;
  /** Verbo del avance en modo `progress` (p. ej. "despachadas", "en camino a Ecuador"). */
  progressVerb?: string;
  /** Unidad mostrada en modo `count` (por defecto "piezas"). */
  unitLabel?: string;
  className?: string;
  /**
   * Render del estado "total desconocido". Si es `undefined` se usa un aviso por
   * defecto; si es `null` no se renderiza nada.
   */
  pending?: ReactNode;
}

const SEGMENTS = [
  { key: 'registradas', bar: 'bg-[var(--color-info)]', dot: 'bg-[var(--color-info)]' },
  { key: 'recibidas', bar: 'bg-[var(--color-warning)]', dot: 'bg-[var(--color-warning)]' },
  { key: 'despachadas', bar: 'bg-[var(--color-success)]', dot: 'bg-[var(--color-success)]' },
] as const;

function pct(n: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, (n / total) * 100);
}

export function PiezasProgress({
  total,
  registradas,
  recibidas,
  despachadas,
  size = 'sm',
  labels,
  headingMode = 'count',
  heading = 'Progreso de piezas',
  progressVerb = 'despachadas',
  unitLabel = 'piezas',
  className,
  pending,
}: PiezasProgressProps) {
  const L = { ...DEFAULT_LABELS, ...labels };

  // Estado sin total definido.
  if (total == null || total <= 0) {
    if (pending === null) return null;
    return (
      pending ?? (
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border border-dashed border-[var(--color-warning)]/35 bg-[var(--color-warning)]/8 px-2.5 py-1.5 text-[var(--color-warning)]',
            size === 'sm' ? 'text-[11px]' : 'text-xs',
            className,
          )}
        >
          <span className="inline-block size-1.5 shrink-0 rounded-full bg-[var(--color-warning)]" aria-hidden />
          Total de piezas por confirmar
        </div>
      )
    );
  }

  const values = { registradas, recibidas, despachadas } as const;
  const completas = despachadas >= total;
  const pctDespachadas = Math.round(pct(despachadas, total));

  const barHeight = size === 'sm' ? 'h-2' : 'h-2.5';
  const legendText = size === 'sm' ? 'text-[11px]' : 'text-xs';
  const dotSize = size === 'sm' ? 'size-1.5' : 'size-2';

  return (
    <div
      className={cn(size === 'sm' ? 'min-w-[11rem] space-y-1.5' : 'space-y-2', className)}
    >
      {/* Encabezado */}
      {headingMode === 'none' ? null : headingMode === 'count' ? (
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn('tabular-nums', size === 'sm' ? 'text-xs' : 'text-sm')}>
            <span className="font-semibold text-[var(--color-foreground)]">{registradas}</span>
            <span className="text-[var(--color-muted-foreground)]"> / {total} {unitLabel}</span>
          </span>
          <span
            className={cn(
              'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
              completas
                ? 'bg-[var(--color-success)]/12 text-[var(--color-success)]'
                : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
            )}
          >
            {completas ? 'Completa' : `${pctDespachadas}%`}
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs">
          <span className="font-medium text-[var(--color-muted-foreground)]">{heading}</span>
          <span className="text-[var(--color-muted-foreground)] tabular-nums">
            <span className="font-semibold text-[var(--color-foreground)]">{despachadas}</span> de{' '}
            {total} {progressVerb}
            <span
              className={cn(
                'ml-1.5 font-semibold',
                completas ? 'text-[var(--color-success)]' : 'text-[var(--color-foreground)]',
              )}
            >
              · {pctDespachadas}%
            </span>
          </span>
        </div>
      )}

      {/* Barra segmentada anidada */}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-[var(--color-muted)] ring-1 ring-inset ring-black/5 dark:ring-white/10',
          barHeight,
        )}
        role="img"
        aria-label={`${registradas} ${L.registradas.toLowerCase()}, ${recibidas} ${L.recibidas.toLowerCase()}, ${despachadas} ${L.despachadas.toLowerCase()} de ${total}`}
      >
        {SEGMENTS.map((s) => (
          <div
            key={s.key}
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-[width] [transition-duration:var(--motion-slow)] [transition-timing-function:var(--motion-ease-standard)] motion-reduce:transition-none',
              s.bar,
            )}
            style={{ width: `${pct(values[s.key], total)}%` }}
          />
        ))}
      </div>

      {/* Leyenda */}
      <div className={cn('flex flex-wrap gap-x-3 gap-y-1', legendText)}>
        {SEGMENTS.map((s) => (
          <span
            key={s.key}
            className="inline-flex items-center gap-1.5 text-[var(--color-muted-foreground)]"
          >
            <span className={cn('shrink-0 rounded-full', dotSize, s.dot)} aria-hidden />
            {L[s.key]}
            <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
              {values[s.key]}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
