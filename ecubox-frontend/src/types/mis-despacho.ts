export interface MiDespachoPieza {
  paqueteId: number;
  numeroGuia: string;
  ref?: string | null;
  contenido?: string | null;
  pesoLbs?: number | null;
  pesoKg?: number | null;
  estadoNombre?: string | null;
  estadoCodigo?: string | null;
  /** El cliente puede confirmar esta pieza (ya en tránsito y aún no entregada). */
  confirmable: boolean;
}

export interface MiDespachoDetalle {
  despachoId: number;
  numeroGuia?: string | null;
  codigoPrecinto?: string | null;
  fecha?: string | null;
  tipoEntrega?: string | null;
  destinoNombre?: string | null;
  observaciones?: string | null;
  totalPiezas: number;
  pesoLbsTotal?: number | null;
  pesoKgTotal?: number | null;
  confirmable: boolean;
  entregaConfirmada: boolean;
  piezas: MiDespachoPieza[];
}

export interface MiDespacho {
  despachoId: number;
  fecha?: string | null;
  tipoEntrega?: string | null;
  totalPiezas: number;
  /** Hay al menos una pieza confirmable ahora. */
  confirmable: boolean;
  /** Todas las piezas del cliente ya están entregadas/confirmadas. */
  entregaConfirmada: boolean;
  piezas: MiDespachoPieza[];
}
