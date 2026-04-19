import type { Paquete } from '@/types/paquete';

/**
 * Envio consolidado: agrupador interno del operario.
 *
 * El estado se representa por `cerrado` (derivado de `fechaCerrado != null`).
 * No tiene maquina de estados ni se expone en el tracking publico.
 */
export interface EnvioConsolidado {
  id: number;
  codigo: string;
  /** true si fechaCerrado != null. Lo provee el backend por conveniencia. */
  cerrado: boolean;
  fechaCerrado?: string;
  pesoTotalLbs?: number;
  totalPaquetes: number;
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
