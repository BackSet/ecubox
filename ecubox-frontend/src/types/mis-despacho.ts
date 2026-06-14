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
  /** Operador u oficina que entrega (courier de entrega o agencia ECUBOX). */
  operadorEntregaNombre?: string | null;
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
  /** Número de guía de la entrega (del despacho). */
  numeroGuia?: string | null;
  fecha?: string | null;
  tipoEntrega?: string | null;
  /** Destino de la entrega resuelto por modalidad (snapshot histórico SCD2). */
  destinoNombre?: string | null;
  /** Operador u oficina que entrega (courier de entrega o agencia ECUBOX). */
  operadorEntregaNombre?: string | null;
  totalPiezas: number;
  /** Peso total (lbs) de solo las piezas del cliente. */
  pesoLbsTotal?: number | null;
  /** Peso total (kg) de solo las piezas del cliente. */
  pesoKgTotal?: number | null;
  /** Hay al menos una pieza confirmable ahora. */
  confirmable: boolean;
  /** Todas las piezas del cliente ya están entregadas/confirmadas. */
  entregaConfirmada: boolean;
  piezas: MiDespachoPieza[];
}
