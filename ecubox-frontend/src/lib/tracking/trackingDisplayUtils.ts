import type {
  TrackingEstadoItem,
  TrackingResolveResponse,
  TrackingResponse,
} from '@/lib/api/tracking.service';

export function formatFechaEstadoDesde(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('es-EC', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export function codigoFromResolved(
  resolved: TrackingResolveResponse | null,
  fallback: string
): string {
  if (!resolved) return fallback.trim();
  if (resolved.tipo === 'PIEZA') return resolved.pieza?.numeroGuia ?? fallback.trim();
  if (resolved.tipo === 'GUIA_MASTER') return resolved.master?.trackingBase ?? fallback.trim();
  return fallback.trim();
}

export interface TrackingPiezaDisplay {
  pieza: TrackingResponse;
  estados: TrackingEstadoItem[];
  fechaFormateada: string | null;
  currentIndex: number;
  totalPasosBase: number;
  pasoBaseActual: number;
  progresoDeterminado: boolean;
  hasDespachoInfo: boolean;
  hasPaquetesDespacho: boolean;
  hasOperadorEntrega: boolean;
  piezasHermanas: NonNullable<TrackingResponse['master']>['piezas'];
  tieneMultiplesPiezas: boolean;
  totalEsperadasMaster: number;
}

export function computePiezaDisplay(pieza: TrackingResponse): TrackingPiezaDisplay {
  const estados: TrackingEstadoItem[] = pieza.estados ?? [];
  const currentIndex = estados.findIndex((e) => e.esActual);
  const estadosBase = estados.filter((e) => e.tipoFlujo !== 'ALTERNO');
  const totalPasosBase = estadosBase.length;
  const pasoBaseActual = (() => {
    const actual = estados.find((e) => e.esActual);
    if (!actual) return 0;
    if (actual.tipoFlujo === 'ALTERNO') {
      if (actual.afterEstadoId == null) return 0;
      const anchorIndex = estadosBase.findIndex((e) => e.id === actual.afterEstadoId);
      return anchorIndex >= 0 ? anchorIndex + 1 : 0;
    }
    const baseIndex = estadosBase.findIndex((e) => e.id === actual.id);
    return baseIndex >= 0 ? baseIndex + 1 : 0;
  })();
  const progresoDeterminado = totalPasosBase > 0 && pasoBaseActual > 0;
  const piezasHermanas = pieza.master?.piezas ?? [];

  return {
    pieza,
    estados,
    fechaFormateada: formatFechaEstadoDesde(pieza.fechaEstadoDesde),
    currentIndex,
    totalPasosBase,
    pasoBaseActual,
    progresoDeterminado,
    hasDespachoInfo: pieza.despacho != null,
    hasPaquetesDespacho: (pieza.paquetesDespacho?.length ?? 0) > 0,
    hasOperadorEntrega: pieza.operadorEntrega != null,
    piezasHermanas,
    tieneMultiplesPiezas: piezasHermanas.length > 1,
    totalEsperadasMaster:
      pieza.master?.totalPiezasEsperadas ?? pieza.master?.piezasRegistradas ?? 0,
  };
}
