import type { Paquete } from '@/types/paquete';

/**
 * Envio consolidado: agrupador interno del operario.
 *
 * El estado operativo se representa por `estadoOperativo`; `cerrado` se
 * conserva como bandera compatible de salida USA (`fechaCerrado != null`).
 * No tiene maquina de estados ni se expone en el tracking publico.
 */
export type EstadoPagoConsolidado = 'NO_PAGADO' | 'PAGADO';
export type EstadoEnvioConsolidadoOperativo =
  | 'VACIO'
  | 'EN_PREPARACION'
  | 'ENVIADO_DESDE_USA'
  | 'RECIBIDO_EN_BODEGA'
  | 'LIQUIDADO';

export interface EnvioConsolidado {
  id: number;
  codigo: string;
  /** true si ya fue enviado desde USA. Lo provee el backend por conveniencia. */
  cerrado: boolean;
  estadoOperativo?: EstadoEnvioConsolidadoOperativo;
  fechaCerrado?: string;
  pesoTotalLbs?: number;
  totalPaquetes: number;
  /** Estado de pago de la liquidación asociada. */
  estadoPago?: EstadoPagoConsolidado;
  createdAt?: string;
  updatedAt?: string;
  paquetes?: Paquete[];
}

export interface EnvioConsolidadoCreateRequest {
  codigo: string;
  numerosGuia?: string[];
}

export interface EnvioConsolidadoCreateResponse {
  envio: EnvioConsolidado;
  guiasNoEncontradas: string[];
}

export interface EnvioConsolidadoPaquetesRequest {
  paqueteIds: number[];
}

/**
 * @deprecated Usa `PageResponse<EnvioConsolidado>` de `@/types/page` en su lugar.
 *             Se mantiene como alias para no romper consumidores antiguos.
 */
export interface EnvioConsolidadoListResponse {
  content: EnvioConsolidado[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  first: boolean;
  last: boolean;
}
