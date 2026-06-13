import type {
  EstadisticaDistribucionEstado,
  EstadisticaSeriePunto,
  GranularidadEstadisticas,
} from '@/types/estadisticas';

const GRANULARIDAD_ADJETIVO: Record<GranularidadEstadisticas, string> = {
  DIARIA: 'diaria',
  SEMANAL: 'semanal',
  MENSUAL: 'mensual',
  TRIMESTRAL: 'trimestral',
};

interface SeriesChartProps {
  despachos: EstadisticaSeriePunto[];
  registros: EstadisticaSeriePunto[];
  granularidad: GranularidadEstadisticas;
}

/**
 * Gráfico de barras de la evolución del periodo. No asume que las etiquetas son
 * meses: se adapta a granularidad diaria, semanal, mensual o trimestral.
 */
export function SeriesChart({ despachos, registros, granularidad }: SeriesChartProps) {
  const maxValue = Math.max(
    1,
    ...despachos.map((item) => item.total),
    ...registros.map((item) => item.total),
  );
  // Con muchos puntos (p. ej. serie diaria) las barras se estrechan.
  const densa = despachos.length > 20;
  const adjetivo = GRANULARIDAD_ADJETIVO[granularidad];

  return (
    <figure>
      <div
        className="flex h-64 items-end gap-1.5 overflow-x-auto border-b border-l border-[var(--color-border)] px-3 pt-5"
        role="img"
        aria-label={`Comparación ${adjetivo} de despachos y paquetes registrados`}
      >
        {despachos.map((item, index) => {
          const registro = registros[index]?.total ?? 0;
          const dispatchHeight = Math.max(2, (item.total / maxValue) * 100);
          const registeredHeight = Math.max(2, (registro / maxValue) * 100);
          return (
            <div
              key={item.periodo}
              className={`flex h-full flex-1 flex-col justify-end ${densa ? 'min-w-6' : 'min-w-12'}`}
              title={`${item.etiqueta}: ${item.total} despachos, ${registro} paquetes registrados`}
            >
              <div className="flex h-[calc(100%-2rem)] items-end justify-center gap-1">
                <div
                  className="w-2.5 rounded-t bg-[var(--color-primary)] transition-[height] [transition-duration:var(--motion-normal)] [transition-timing-function:var(--motion-ease-standard)] motion-reduce:transition-none"
                  style={{ height: `${dispatchHeight}%` }}
                  aria-hidden
                />
                <div
                  className="w-2.5 rounded-t bg-[var(--color-info)] transition-[height] [transition-duration:var(--motion-normal)] [transition-timing-function:var(--motion-ease-standard)] motion-reduce:transition-none"
                  style={{ height: `${registeredHeight}%` }}
                  aria-hidden
                />
              </div>
              {!densa || index % 2 === 0 ? (
                <span className="mt-2 truncate text-center text-[10px] text-[var(--color-muted-foreground)]">
                  {item.etiqueta}
                </span>
              ) : (
                <span className="mt-2 h-[14px]" aria-hidden />
              )}
            </div>
          );
        })}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-4 text-[12px] text-[var(--color-muted-foreground)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-primary)]" />
          Despachos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-info)]" />
          Paquetes registrados
        </span>
      </figcaption>
    </figure>
  );
}

export function StatusDistributionChart({
  data,
}: {
  data: EstadisticaDistribucionEstado[];
}) {
  const maxValue = Math.max(1, ...data.map((item) => item.total));
  const total = data.reduce((sum, item) => sum + item.total, 0);

  return (
    <figure className="space-y-3">
      {data.map((item) => {
        const width = (item.total / maxValue) * 100;
        const percentage = total > 0 ? Math.round((item.total / total) * 100) : 0;
        return (
          <div key={item.estadoId} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-[12px]">
              <span className="truncate font-medium text-[var(--color-foreground)]">
                {item.nombre}
              </span>
              <span className="shrink-0 tabular-nums text-[var(--color-muted-foreground)]">
                {item.total} · {percentage}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-muted)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-[width] [transition-duration:var(--motion-normal)] [transition-timing-function:var(--motion-ease-standard)] motion-reduce:transition-none"
                style={{ width: `${Math.max(1, width)}%` }}
              />
            </div>
          </div>
        );
      })}
      <figcaption className="sr-only">
        Distribución actual de paquetes agrupados por estado de rastreo.
      </figcaption>
    </figure>
  );
}
