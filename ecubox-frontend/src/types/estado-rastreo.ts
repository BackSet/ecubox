export type TipoFlujoEstado = 'NORMAL' | 'ALTERNO' | 'MIXTO';

export interface EstadoRastreo {
  id: number;
  codigo: string;
  nombre: string;
  orden?: number;
  ordenTracking: number;
  afterEstadoId?: number | null;
  activo: boolean;
  leyenda?: string | null;
  tipoFlujo?: TipoFlujoEstado;
  bloqueante?: boolean;
  publicoTracking?: boolean;
}

export interface EstadoRastreoRequest {
  codigo: string;
  nombre: string;
  orden?: number;
  ordenTracking?: number;
  afterEstadoId?: number | null;
  activo?: boolean;
  leyenda?: string | null;
  tipoFlujo?: TipoFlujoEstado;
  bloqueante?: boolean;
  publicoTracking?: boolean;
}

export interface EstadoRastreoTransicion {
  id?: number;
  estadoOrigenId: number;
  estadoDestinoId: number;
  estadoDestinoCodigo?: string;
  estadoDestinoNombre?: string;
  requiereResolucion: boolean;
  activo: boolean;
}

export interface EstadoRastreoOrdenTrackingRequest {
  estadoIds: number[];
  alternosAfter?: EstadoRastreoAlternoAfterItem[];
}

export interface EstadoRastreoAlternoAfterItem {
  estadoId: number;
  afterEstadoId: number;
}

export interface EstadoRastreoTransicionUpsertItem {
  estadoDestinoId: number;
  requiereResolucion: boolean;
  activo: boolean;
}

export interface EstadosRastreoPorPunto {
  estadoRastreoRegistroPaqueteId: number;
  estadoRastreoEnLoteRecepcionId: number;
  estadoRastreoEnDespachoId: number;
  estadoRastreoEnTransitoId: number;
}

export interface EstadosRastreoPorPuntoRequest {
  estadoRastreoRegistroPaqueteId: number;
  estadoRastreoEnLoteRecepcionId: number;
  estadoRastreoEnDespachoId: number;
  estadoRastreoEnTransitoId: number;
}
