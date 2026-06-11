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

/**
 * Vista del catálogo de estados de rastreo para el cliente
 * (GET /api/mis-guias/estados-rastreo): subconjunto sin campos
 * de administración.
 */
export interface EstadoRastreoCliente {
  id: number;
  nombre: string;
  leyenda?: string | null;
  ordenTracking: number;
  tipoFlujo?: TipoFlujoEstado;
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
  estadoRastreoAsociarEnvioConsolidadoId?: number | null;
  estadoRastreoAsociarGuiaMasterId?: number | null;
  estadoRastreoEnDespachoId: number;
  estadoRastreoEnTransitoId: number;
  estadoRastreoEntregaConfirmadaClienteId?: number | null;
  estadoRastreoAvisoConfirmacionEntregaId?: number | null;
  estadoRastreoEnviadoDesdeUsaId?: number | null;
  estadoRastreoArribadoEcId?: number | null;
  estadoRastreoInicioCuentaRegresivaId?: number | null;
  estadoRastreoFinCuentaRegresivaId?: number | null;
  estadoRastreoCierreConsolidadoId?: number | null;
  estadoRastreoArriboEcuadorId?: number | null;
}

export interface EstadosRastreoPorPuntoRequest {
  estadoRastreoRegistroPaqueteId: number;
  estadoRastreoEnLoteRecepcionId: number;
  estadoRastreoAsociarEnvioConsolidadoId: number;
  estadoRastreoAsociarGuiaMasterId: number;
  estadoRastreoEnDespachoId: number;
  estadoRastreoEnTransitoId: number;
  estadoRastreoEntregaConfirmadaClienteId?: number | null;
  estadoRastreoAvisoConfirmacionEntregaId?: number | null;
  estadoRastreoEnviadoDesdeUsaId: number;
  estadoRastreoArribadoEcId: number;
  estadoRastreoInicioCuentaRegresivaId?: number | null;
  estadoRastreoFinCuentaRegresivaId?: number | null;
  estadoRastreoCierreConsolidadoId?: number | null;
  estadoRastreoArriboEcuadorId?: number | null;
}
