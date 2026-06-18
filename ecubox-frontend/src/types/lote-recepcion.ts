import type { Paquete } from '@/types/paquete';

/**
 * Resumen de la aplicación del estado de "llegada a bodega" durante la
 * recepción. Solo viene en la respuesta de crear/agregar guías. Los omitidos no
 * se degradan: son paquetes ya en bodega, posteriores/terminales, alternos o
 * bloqueados.
 */
export interface RecepcionEstadoResumen {
  total: number;
  avanzados: number;
  sinCambioMismoEstado: number;
  omitidosPosteriores: number;
  omitidosAlternos: number;
  omitidosBloqueados: number;
}

export interface LoteRecepcion {
  id: number;
  fechaRecepcion: string;
  observaciones?: string;
  operarioId?: number;
  operarioNombre?: string;
  numeroGuiasEnvio: string[];
  paquetes?: Paquete[];
  totalPaquetes?: number;
  /** Solo en respuesta de crear/agregar guías. */
  resumenRecepcion?: RecepcionEstadoResumen;
}

export interface LoteRecepcionCreateRequest {
  fechaRecepcion?: string;
  observaciones?: string;
  numeroGuiasEnvio: string[];
}
