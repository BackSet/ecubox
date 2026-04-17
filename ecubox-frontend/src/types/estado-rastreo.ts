export type TipoFlujoEstado = 'NORMAL' | 'ALTERNO';

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
  publicoTracking?: boolean;
}

export interface EstadoRastreoOrdenTrackingRequest {
  estadoIds: number[];
  alternosAfter?: EstadoRastreoAlternoAfterItem[];
}

export interface EstadoRastreoAlternoAfterItem {
  estadoId: number;
  afterEstadoId: number;
}

export interface EstadosRastreoPorPunto {
  estadoRastreoRegistroPaqueteId: number;
  estadoRastreoEnLoteRecepcionId: number;
  estadoRastreoEnDespachoId: number;
  estadoRastreoEnTransitoId: number;
  estadoRastreoFinCuentaRegresivaId?: number | null;
}

export interface EstadosRastreoPorPuntoRequest {
  estadoRastreoRegistroPaqueteId: number;
  estadoRastreoEnLoteRecepcionId: number;
  estadoRastreoEnDespachoId: number;
  estadoRastreoEnTransitoId: number;
  estadoRastreoFinCuentaRegresivaId?: number | null;
}
