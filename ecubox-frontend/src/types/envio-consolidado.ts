import type { Paquete } from '@/types/paquete';

/**
 * Envio consolidado: agrupador interno del operario.
 *
 * El estado operativo se representa por `estadoOperativo`; `cerrado` se
 * conserva como bandera compatible de salida USA (`fechaCerrado != null`).
 * No tiene maquina de estados ni se expone en el tracking publico.
 */
export type EstadoPagoConsolidado = 'NO_PAGADO' | 'PAGADO';

/**
 * Estado operativo persistido del consolidado — flujo v2 (V107).
 *
 * Flujo normal: VACIO → EN_PREPARACION → CERRADO → ENVIADO_DESDE_USA
 *   → ARRIBADO_ECUADOR → RECIBIDO_EN_BODEGA → LIQUIDADO
 * Cancelación: VACIO | EN_PREPARACION → CANCELADO
 */
export type EstadoEnvioConsolidadoOperativo =
  | 'VACIO'
  | 'EN_PREPARACION'
  | 'CERRADO'
  | 'ENVIADO_DESDE_USA'
  | 'ARRIBADO_ECUADOR'
  | 'RECIBIDO_EN_BODEGA'
  | 'LIQUIDADO'
  | 'CANCELADO';

/** Un estado dentro del resumen agregado de paquetes de un consolidado. */
export interface EstadoPaqueteResumenItem {
  /** id del estado de rastreo; null representa "Sin estado". */
  estadoId: number | null;
  codigo?: string | null;
  nombre: string;
  cantidad: number;
  ordenTracking?: number | null;
  tipoFlujo?: string | null;
  /** true si requiere atención (flujo alterno o sin estado). */
  requiereAtencion: boolean;
}

/**
 * Resumen agregado de los estados de rastreo de los paquetes de un consolidado.
 * Calculado en backend por lote (sin N+1); solo viene en el listado.
 */
export interface ResumenEstadosPaquetesConsolidado {
  totalPaquetes: number;
  estados: EstadoPaqueteResumenItem[];
  cantidadRequiereAtencion: number;
  estadosMixtos: boolean;
}

export interface EnvioConsolidado {
  id: number;
  codigo: string;
  /** true si el consolidado ya no admite cambios de paquetes (estado posterior a EN_PREPARACION). */
  cerrado: boolean;
  estadoOperativo?: EstadoEnvioConsolidadoOperativo;
  /** Fecha de cierre para registro (estado CERRADO). */
  fechaCierre?: string;
  /** Fecha de salida desde USA (estado ENVIADO_DESDE_USA). */
  fechaCerrado?: string;
  /** Fecha de arribo a Ecuador / aduana destino (estado ARRIBADO_ECUADOR). */
  fechaArriboEcuador?: string;
  pesoTotalLbs?: number;
  totalPaquetes: number;
  /** Estado de pago de la liquidación asociada. */
  estadoPago?: EstadoPagoConsolidado;
  createdAt?: string;
  updatedAt?: string;
  paquetes?: Paquete[];
  /** Resumen agregado de estados de paquetes (solo en el listado paginado). */
  resumenEstadosPaquetes?: ResumenEstadosPaquetesConsolidado;
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
