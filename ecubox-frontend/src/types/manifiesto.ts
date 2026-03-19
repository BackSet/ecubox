export type EstadoManifiesto = 'PENDIENTE' | 'PAGADO' | 'ANULADO';

export type FiltroManifiesto = 'POR_PERIODO' | 'POR_DISTRIBUIDOR' | 'POR_AGENCIA';

export interface DespachoEnManifiesto {
  id: number;
  numeroGuia: string;
  distribuidorNombre: string | null;
  tipoEntrega: string;
  agenciaNombre: string | null;
  destinatarioNombre: string | null;
}

export interface ManifiestoDespachoCandidato {
  id: number;
  numeroGuia: string;
  distribuidorNombre: string | null;
  tipoEntrega: string | null;
  agenciaNombre: string | null;
  destinatarioNombre: string | null;
  fechaHora: string | null;
}

export interface Manifiesto {
  id: number;
  codigo: string;
  fechaInicio: string;
  fechaFin: string;
  filtroTipo: FiltroManifiesto;
  filtroDistribuidorId: number | null;
  filtroDistribuidorNombre: string | null;
  filtroAgenciaId: number | null;
  filtroAgenciaNombre: string | null;
  cantidadDespachos: number;
  subtotalDomicilio: number;
  subtotalAgenciaFlete: number;
  subtotalComisionAgencias: number;
  totalDistribuidor: number;
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
  filtroDistribuidorId?: number | null;
  filtroAgenciaId?: number | null;
}

export interface AsignarDespachosRequest {
  despachoIds: number[];
}
