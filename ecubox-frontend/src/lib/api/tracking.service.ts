export interface TrackingEstadoItem {
  id: number;
  codigo: string;
  nombre: string;
  orden: number;
  tipoFlujo?: 'NORMAL' | 'ALTERNO';
  leyenda: string | null;
  esActual: boolean;
  /** Timestamp real desde el event log; null para pasos futuros del catalogo. */
  fechaOcurrencia?: string | null;
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

/**
 * Datos publicos del destinatario expuestos en el tracking.
 *
 * Nota PII: el backend NO expone `telefono` ni `direccion` exacta en el endpoint
 * publico, por lo que esta interfaz solo declara los campos seguros.
 */
export interface TrackingDestinatario {
  id?: number;
  nombre?: string;
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
  /**
   * Resumen de la guia master a la que pertenece esta pieza, con la lista de
   * piezas hermanas para que el cliente pueda navegar al tracking de cada una.
   * Solo viene poblado cuando la guia consolida mas de una pieza.
   * El feed agregado (timeline) se omite en esta vista para no inflar la respuesta.
   */
  master?: TrackingMasterResponse | null;
}

/**
 * Tipos polimorficos del endpoint unificado /api/v1/tracking?codigo=.
 *
 * Nota: el envio consolidado es interno del operario y NO se expone en el
 * tracking publico, por eso solo aparecen pieza y guia master.
 */
export type TrackingTipo = 'PIEZA' | 'GUIA_MASTER';

export type EstadoGuiaMaster =
  | 'INCOMPLETA'
  | 'PARCIAL_RECIBIDA'
  | 'COMPLETA_RECIBIDA'
  | 'PARCIAL_DESPACHADA'
  | 'CERRADA'
  | 'CERRADA_CON_FALTANTE';

export interface TrackingPiezaItem {
  numeroGuia: string;
  piezaNumero?: number;
  piezaTotal?: number;
  estadoActualCodigo?: string;
  estadoActualNombre?: string;
  fechaEstadoDesde?: string;
  enFlujoAlterno?: boolean;
  bloqueado?: boolean;
}

export interface TrackingMasterEventoItem {
  numeroGuia: string;
  piezaNumero?: number;
  piezaTotal?: number;
  estadoCodigo?: string;
  estadoNombre?: string;
  eventoTipo?: string;
  occurredAt?: string;
}

export interface TrackingMasterResponse {
  trackingBase: string;
  estadoGlobal?: EstadoGuiaMaster;
  totalPiezasEsperadas?: number;
  piezasRegistradas?: number;
  piezasRecibidas?: number;
  piezasDespachadas?: number;
  /** @deprecated Mantener por compatibilidad. Usar `destinatario`. */
  destinatarioNombre?: string;
  destinatario?: TrackingDestinatario | null;
  piezas?: TrackingPiezaItem[];
  fechaPrimeraRecepcion?: string;
  fechaPrimeraPiezaDespachada?: string;
  ultimaActualizacion?: string;
  timeline?: TrackingMasterEventoItem[];
}

export interface TrackingResolveResponse {
  tipo: TrackingTipo;
  pieza?: TrackingResponse | null;
  master?: TrackingMasterResponse | null;
}

/** Construye la URL absoluta del endpoint de tracking unificado. */
function getTrackingV1Url(): string {
  const base = import.meta.env.VITE_API_URL ?? '/api';
  const path = '/api/v1/tracking';
  if (typeof base === 'string' && base.startsWith('http')) {
    const host = base.replace(/\/+$/, '');
    return host.endsWith('/api') ? `${host}/v1/tracking` : `${host}${path}`;
  }
  const relative = base.startsWith('/') ? base : `/${base}`;
  const pathFromBase = relative.endsWith('/')
    ? 'v1/tracking'
    : `${relative.replace(/\/+$/, '')}/v1/tracking`;
  if (typeof window !== 'undefined') {
    return new URL(pathFromBase, window.location.origin).toString();
  }
  return pathFromBase;
}

async function parseError(res: Response, fallback: string): Promise<Error> {
  let backendMessage: string | undefined;
  try {
    const maybeJson = (await res.json()) as { message?: string };
    backendMessage = maybeJson?.message;
  } catch {
    backendMessage = undefined;
  }
  if (res.status === 404) {
    const err = new Error(
      'No encontramos un envío con ese código. Revisa el número e intenta de nuevo.'
    );
    (err as Error & { status?: number }).status = 404;
    return err;
  }
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After'));
    const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : 60;
    const message =
      seconds >= 60
        ? `Estás haciendo muchas consultas. Espera unos minutos antes de volver a intentarlo.`
        : `Demasiadas consultas seguidas. Intenta nuevamente en ${seconds} segundo${seconds === 1 ? '' : 's'}.`;
    const err = new Error(message);
    (err as Error & { status?: number; retryAfter?: number }).status = 429;
    (err as Error & { status?: number; retryAfter?: number }).retryAfter = seconds;
    return err;
  }
  return new Error(backendMessage || res.statusText || fallback);
}

/**
 * Consulta publica de tracking unificada (sin autenticacion).
 * Resuelve el codigo a pieza individual o guia master.
 *
 * El envio consolidado NO se resuelve aqui: es un agrupador interno del
 * operario y no se expone publicamente.
 */
export async function getTrackingByCodigo(
  codigo: string,
  options?: { signal?: AbortSignal }
): Promise<TrackingResolveResponse> {
  const url = new URL(getTrackingV1Url());
  url.searchParams.set('codigo', codigo.trim());
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options?.signal,
  });
  if (!res.ok) {
    throw await parseError(res, 'No pudimos cargar el seguimiento.');
  }
  return res.json();
}

/**
 * Alias historico por compatibilidad con codigo existente. Internamente usa el
 * endpoint unificado; si el codigo resuelve a guia master lanza error para no
 * romper consumidores que esperan estrictamente una pieza individual.
 *
 * @deprecated usar getTrackingByCodigo
 */
export async function getTrackingByNumeroGuia(
  numeroGuia: string,
  options?: { signal?: AbortSignal }
): Promise<TrackingResponse> {
  const resolved = await getTrackingByCodigo(numeroGuia, options);
  if (resolved.tipo !== 'PIEZA' || !resolved.pieza) {
    const err = new Error(
      'El código corresponde a una guía master, no a una pieza individual.'
    );
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  return resolved.pieza;
}
