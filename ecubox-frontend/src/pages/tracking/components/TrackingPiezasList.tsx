import { useMemo } from 'react';
import type { MouseEvent } from 'react';
import { ExternalLink, PackageOpen } from 'lucide-react';
import type { TrackingPiezaItem } from '@/lib/api/tracking.service';

interface TrackingPiezasListProps {
  piezas: TrackingPiezaItem[];
  /**
   * Total de piezas esperadas en la guía master. Se usa para mostrar
   * "Pieza N/M" cuando una pieza individual no tiene poblado su {@code piezaTotal}.
   */
  totalEsperadas?: number;
  /** Número de guía actualmente seleccionado: se resalta y se deshabilita su enlace. */
  numeroGuiaActual?: string;
  /**
   * Handler ejecutado al hacer click izquierdo sin modificadores: navega "in place"
   * dentro de la misma página de tracking. Para Ctrl/Cmd/middle click el enlace
   * se abre normalmente en una pestaña nueva (gracias al {@code href} real).
   */
  onSelectPieza: (numeroGuia: string) => void;
  /** Título opcional del bloque (por defecto "Piezas de esta guía"). */
  titulo?: string;
  /** Mensaje opcional cuando no hay piezas. */
  emptyMessage?: string;
}

/**
 * Construye la URL pública del tracking de una pieza individual.
 * El parámetro canónico es {@code codigo}; mantenemos {@code numeroGuia} fuera
 * para no contaminar la URL con alias deprecated.
 */
function buildTrackingUrl(numeroGuia: string): string {
  if (typeof window === 'undefined') {
    return `/tracking?codigo=${encodeURIComponent(numeroGuia)}`;
  }
  const url = new URL(window.location.origin + '/tracking');
  url.searchParams.set('codigo', numeroGuia);
  return url.toString();
}

function formatDateTime(iso?: string): string | null {
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

export function TrackingPiezasList({
  piezas,
  totalEsperadas,
  numeroGuiaActual,
  onSelectPieza,
  titulo = 'Piezas de esta guía',
  emptyMessage = 'Todavía no hay piezas registradas en esta guía.',
}: TrackingPiezasListProps) {
  const piezasOrdenadas = useMemo(
    () =>
      [...piezas].sort((a, b) => {
        const an = a.piezaNumero ?? 0;
        const bn = b.piezaNumero ?? 0;
        return an - bn;
      }),
    [piezas]
  );

  return (
    <div className="surface-card p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">{titulo}</h3>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {piezasOrdenadas.length} {piezasOrdenadas.length === 1 ? 'pieza' : 'piezas'}
        </span>
      </div>

      {piezasOrdenadas.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">{emptyMessage}</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {piezasOrdenadas.map((p) => (
            <PiezaRow
              key={p.numeroGuia}
              pieza={p}
              totalEsperadas={totalEsperadas}
              esActual={numeroGuiaActual === p.numeroGuia}
              onSelectPieza={onSelectPieza}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface PiezaRowProps {
  pieza: TrackingPiezaItem;
  totalEsperadas?: number;
  esActual: boolean;
  onSelectPieza: (numeroGuia: string) => void;
}

function PiezaRow({ pieza, totalEsperadas, esActual, onSelectPieza }: PiezaRowProps) {
  const fecha = formatDateTime(pieza.fechaEstadoDesde);
  const piezaTotal = pieza.piezaTotal ?? totalEsperadas ?? 0;
  const piezaLabel =
    pieza.piezaNumero != null && piezaTotal > 0
      ? `Pieza ${pieza.piezaNumero}/${piezaTotal}`
      : 'Pieza';
  const href = buildTrackingUrl(pieza.numeroGuia);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Permitimos Ctrl/Cmd/middle/shift-click para abrir en pestaña nueva con el
    // comportamiento nativo del navegador. Solo interceptamos el click izquierdo
    // simple para navegar "in place" sin recarga.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    if (esActual) return;
    onSelectPieza(pieza.numeroGuia);
  }

  return (
    <li>
      <a
        href={href}
        onClick={handleClick}
        aria-current={esActual ? 'page' : undefined}
        className={`block py-3 px-2 -mx-2 rounded-md transition ${
          esActual
            ? 'bg-[var(--color-primary)]/10 cursor-default'
            : 'hover:bg-[var(--color-muted)]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm font-medium text-[var(--color-foreground)] break-all">
              {pieza.numeroGuia}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {piezaLabel}
              {fecha ? ` · desde ${fecha}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {pieza.estadoActualNombre ? (
              <span
                className="inline-flex items-center rounded-full bg-[var(--color-muted)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-foreground)]"
                title={pieza.estadoActualCodigo ?? undefined}
              >
                <PackageOpen className="h-3 w-3 mr-1" />
                {pieza.estadoActualNombre}
              </span>
            ) : null}
            {pieza.bloqueado ? (
              <span className="inline-flex items-center rounded-full bg-[var(--color-destructive)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-destructive)]">
                Bloqueado
              </span>
            ) : null}
            {pieza.enFlujoAlterno ? (
              <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                Flujo alterno
              </span>
            ) : null}
            {esActual ? (
              <span className="inline-flex items-center rounded-full bg-[var(--color-primary)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                Viendo ahora
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
                Ver tracking
                <ExternalLink className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>
      </a>
    </li>
  );
}
