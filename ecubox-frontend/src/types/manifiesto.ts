/**
 * Tipos del modulo de Manifiestos.
 *
 * El manifiesto es un agrupador logistico de los despachos enviados en un
 * periodo (a domicilio, agencia o punto de entrega del consignatario).
 * No lleva importes ni estado de pago: esa informacion vive en el modulo
 * de Liquidaciones.
 */

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
