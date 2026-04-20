export type EstadoManifiesto = 'PENDIENTE' | 'PAGADO' | 'ANULADO';

export type FiltroManifiesto = 'POR_PERIODO' | 'POR_COURIER_ENTREGA' | 'POR_AGENCIA';

export interface DespachoEnManifiesto {
  id: number;
  numeroGuia: string;
  courierEntregaNombre: string | null;
  tipoEntrega: string;
  agenciaNombre: string | null;
  consignatarioNombre: string | null;
}

export interface ManifiestoDespachoCandidato {
  id: number;
  numeroGuia: string;
  courierEntregaNombre: string | null;
  tipoEntrega: string | null;
  agenciaNombre: string | null;
  consignatarioNombre: string | null;
  fechaHora: string | null;
}

export interface Manifiesto {
  id: number;
  codigo: string;
  fechaInicio: string;
  fechaFin: string;
  filtroTipo: FiltroManifiesto;
  filtroCourierEntregaId: number | null;
  filtroCourierEntregaNombre: string | null;
  filtroAgenciaId: number | null;
  filtroAgenciaNombre: string | null;
  cantidadDespachos: number;
  subtotalDomicilio: number;
  subtotalAgenciaFlete: number;
  subtotalComisionAgencias: number;
  totalCourierEntrega: number;
  totalAgencia: number;
  totalPagar: number;
  estado: EstadoManifiesto;
  despachos?: DespachoEnManifiesto[];
}

export interface ManifiestoRequest {
  codigo?: string;
  fechaInicio: string;
  fechaFin: string;
  filtroTipo?: FiltroManifiesto;
  filtroCourierEntregaId?: number | null;
  filtroAgenciaId?: number | null;
}

export interface AsignarDespachosRequest {
  despachoIds: number[];
}
