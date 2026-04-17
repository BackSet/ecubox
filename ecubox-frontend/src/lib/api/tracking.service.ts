export interface TrackingEstadoItem {
  id: number;
  codigo: string;
  nombre: string;
  orden: number;
  tipoFlujo?: 'NORMAL' | 'ALTERNO';
  leyenda: string | null;
  esActual: boolean;
}

export interface TrackingDespacho {
  id?: number;
  numeroGuia?: string;
  codigoPrecinto?: string;
  tipoEntrega?: string;
  totalSacas?: number;
  totalPaquetes?: number;
  pesoTotalLbs?: number;
  pesoTotalKg?: number;
}

export interface TrackingSacaActual {
  id?: number;
  numeroOrden?: string;
  tamanio?: string;
  pesoKg?: number;
  pesoLbs?: number;
}

export interface TrackingPaqueteDespacho {
  id?: number;
  numeroGuia?: string;
  estadoRastreoNombre?: string;
  sacaNumeroOrden?: string;
  pesoKg?: number;
  pesoLbs?: number;
}

export interface TrackingDestinatario {
  id?: number;
  nombre?: string;
  telefono?: string;
  direccion?: string;
  provincia?: string;
  canton?: string;
}

export interface TrackingOperadorEntrega {
  tipoEntrega?: string;
  distribuidorNombre?: string;
  distribuidorCodigo?: string;
  horarioRepartoDistribuidor?: string;
  paginaTrackingDistribuidor?: string;
  diasMaxRetiroDomicilio?: number;
  agenciaNombre?: string;
  agenciaCodigo?: string;
  agenciaDireccion?: string;
  agenciaProvincia?: string;
  agenciaCanton?: string;
  horarioAtencionAgencia?: string;
  diasMaxRetiroAgencia?: number;
  agenciaDistribuidorEtiqueta?: string;
  agenciaDistribuidorCodigo?: string;
  agenciaDistribuidorDireccion?: string;
  agenciaDistribuidorProvincia?: string;
  agenciaDistribuidorCanton?: string;
  horarioAtencionAgenciaDistribuidor?: string;
  diasMaxRetiroAgenciaDistribuidor?: number;
}

export interface TrackingResponse {
  numeroGuia: string;
  estadoRastreoId?: number;
  estadoRastreoNombre?: string;
  destinatarioNombre?: string;
  estados?: TrackingEstadoItem[];
  estadoActualId?: number;
  fechaEstadoDesde?: string;
  leyenda?: string | null;
  diasMaxRetiro?: number;
  diasTranscurridos?: number;
  diasRestantes?: number;
  cuentaRegresivaFinalizada?: boolean;
  paqueteVencido?: boolean;
  flujoActual?: 'NORMAL' | 'ALTERNO';
  bloqueado?: boolean;
  motivoAlterno?: string | null;
  despacho?: TrackingDespacho | null;
  sacaActual?: TrackingSacaActual | null;
  paquetesDespacho?: TrackingPaqueteDespacho[];
  destinatario?: TrackingDestinatario | null;
  operadorEntrega?: TrackingOperadorEntrega | null;
}

/** Construye la URL absoluta del endpoint de tracking (siempre /api/tracking en el backend). */
function getTrackingUrl(): string {
  const base = import.meta.env.VITE_API_URL ?? '/api';
  const path = '/api/tracking';
  if (typeof base === 'string' && base.startsWith('http')) {
    const host = base.replace(/\/+$/, '');
    return host.endsWith('/api') ? `${host}/tracking` : `${host}${path}`;
  }
  const relative = base.startsWith('/') ? base : `/${base}`;
  const pathFromBase = relative.endsWith('/') ? 'tracking' : `${relative.replace(/\/+$/, '')}/tracking`;
  if (typeof window !== 'undefined') {
    return new URL(pathFromBase, window.location.origin).toString();
  }
  return pathFromBase;
}

/**
 * Consulta pública de tracking por número de guía (sin autenticación).
 */
export async function getTrackingByNumeroGuia(
  numeroGuia: string,
  options?: { signal?: AbortSignal }
): Promise<TrackingResponse> {
  const url = new URL(getTrackingUrl());
  url.searchParams.set('numeroGuia', numeroGuia.trim());
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options?.signal,
  });
  if (!res.ok) {
    let backendMessage: string | undefined;
    try {
      const maybeJson = (await res.json()) as { message?: string };
      backendMessage = maybeJson?.message;
    } catch {
      backendMessage = undefined;
    }
    if (res.status === 404) {
      const err = new Error('No encontramos un paquete con esa guía. Revisa el número e intenta de nuevo.');
      (err as Error & { status?: number }).status = 404;
      throw err;
    }
    throw new Error(backendMessage || res.statusText || 'No pudimos cargar el seguimiento.');
  }
  return res.json();
}
