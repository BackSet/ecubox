export type TipoFlujoEstado = 'NORMAL' | 'ALTERNO';
import type { EstadoGuiaMaster } from '@/types/guia-master';

export type EstadoConsolidadoOperativo = 'ABIERTO' | 'CERRADO';

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
  estadoRastreoAsociarGuiaMasterId?: number | null;
  estadoRastreoEnDespachoId: number;
  estadoRastreoEnTransitoId: number;
  estadoRastreoEnviadoDesdeUsaId?: number | null;
  estadoRastreoArribadoEcId?: number | null;
  estadoGuiaMasterSinPiezas?: EstadoGuiaMaster | null;
  estadoGuiaMasterEnEsperaRecepcion?: EstadoGuiaMaster | null;
  estadoGuiaMasterRecepcionParcial?: EstadoGuiaMaster | null;
  estadoGuiaMasterRecepcionCompleta?: EstadoGuiaMaster | null;
  estadoGuiaMasterDespachoParcial?: EstadoGuiaMaster | null;
  estadoGuiaMasterDespachoCompletado?: EstadoGuiaMaster | null;
  estadoGuiaMasterDespachoIncompleto?: EstadoGuiaMaster | null;
  estadoGuiaMasterCancelada?: EstadoGuiaMaster | null;
  estadoGuiaMasterEnRevision?: EstadoGuiaMaster | null;
  estadoConsolidadoCreado?: EstadoConsolidadoOperativo | null;
  estadoConsolidadoAgregadoLote?: EstadoConsolidadoOperativo | null;
  estadoConsolidadoCerrado?: EstadoConsolidadoOperativo | null;
  estadoConsolidadoReabierto?: EstadoConsolidadoOperativo | null;
  estadoRastreoInicioCuentaRegresivaId?: number | null;
  estadoRastreoFinCuentaRegresivaId?: number | null;
}

export interface EstadosRastreoPorPuntoRequest {
  estadoRastreoRegistroPaqueteId: number;
  estadoRastreoEnLoteRecepcionId: number;
  estadoRastreoAsociarGuiaMasterId?: number | null;
  estadoRastreoEnDespachoId: number;
  estadoRastreoEnTransitoId: number;
  estadoRastreoEnviadoDesdeUsaId?: number | null;
  estadoRastreoArribadoEcId?: number | null;
  estadoGuiaMasterSinPiezas: EstadoGuiaMaster;
  estadoGuiaMasterEnEsperaRecepcion: EstadoGuiaMaster;
  estadoGuiaMasterRecepcionParcial: EstadoGuiaMaster;
  estadoGuiaMasterRecepcionCompleta: EstadoGuiaMaster;
  estadoGuiaMasterDespachoParcial: EstadoGuiaMaster;
  estadoGuiaMasterDespachoCompletado: EstadoGuiaMaster;
  estadoGuiaMasterDespachoIncompleto: EstadoGuiaMaster;
  estadoGuiaMasterCancelada: EstadoGuiaMaster;
  estadoGuiaMasterEnRevision: EstadoGuiaMaster;
  estadoConsolidadoCreado: EstadoConsolidadoOperativo;
  estadoConsolidadoAgregadoLote: EstadoConsolidadoOperativo;
  estadoConsolidadoCerrado: EstadoConsolidadoOperativo;
  estadoConsolidadoReabierto: EstadoConsolidadoOperativo;
  estadoRastreoInicioCuentaRegresivaId?: number | null;
  estadoRastreoFinCuentaRegresivaId?: number | null;
}
