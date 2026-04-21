import type { Paquete } from '@/types/paquete';

export type TipoEntrega = 'DOMICILIO' | 'AGENCIA' | 'AGENCIA_COURIER_ENTREGA';

export interface AgenciaCourierEntrega {
  id: number;
  courierEntregaId: number;
  courierEntregaNombre?: string;
  codigo: string;
  etiqueta?: string;
  provincia?: string;
  canton?: string;
  direccion?: string;
  horarioAtencion?: string;
  diasMaxRetiro?: number;
}

export interface AgenciaCourierEntregaRequest {
  courierEntregaId: number;
  codigo?: string;
  provincia?: string;
  canton?: string;
  direccion?: string;
  horarioAtencion?: string;
  diasMaxRetiro?: number;
}

export type TamanioSaca = 'INDIVIDUAL' | 'PEQUENO' | 'MEDIANO' | 'GRANDE';

export interface CourierEntrega {
  id: number;
  nombre: string;
  codigo: string;
  email?: string;
  horarioReparto?: string;
  paginaTracking?: string;
  diasMaxRetiroDomicilio?: number;
}

export interface CourierEntregaRequest {
  nombre: string;
  codigo: string;
  email?: string;
  horarioReparto?: string;
  paginaTracking?: string;
  diasMaxRetiroDomicilio?: number;
}

export interface Agencia {
  id: number;
  nombre: string;
  encargado?: string;
  codigo: string;
  direccion?: string;
  provincia?: string;
  canton?: string;
  horarioAtencion?: string;
  diasMaxRetiro?: number;
}

export interface AgenciaRequest {
  nombre: string;
  encargado?: string;
  codigo: string;
  direccion?: string;
  provincia?: string;
  canton?: string;
  horarioAtencion?: string;
  diasMaxRetiro?: number;
}

export interface Saca {
  id: number;
  numeroOrden: string;
  pesoLbs?: number;
  pesoKg?: number;
  tamanio?: TamanioSaca;
  despachoId?: number;
  /** Paquetes de la saca en orden de creación. */
  paquetes?: Paquete[];
  /** Peso total calculado como suma de los paquetes. */
  pesoTotalLbs?: number;
  pesoTotalKg?: number;
}

export interface Despacho {
  id: number;
  numeroGuia: string;
  observaciones?: string;
  codigoPrecinto?: string;
  operarioId?: number;
  operarioNombre?: string;
  fechaHora?: string;
  courierEntregaId: number;
  courierEntregaNombre?: string;
  tipoEntrega: TipoEntrega;
  consignatarioId?: number;
  consignatarioNombre?: string;
  consignatarioDireccion?: string;
  consignatarioTelefono?: string;
  agenciaId?: number;
  agenciaNombre?: string;
  agenciaCourierEntregaId?: number;
  agenciaCourierEntregaNombre?: string;
  sacaIds?: number[];
  /** Sacas con paquetes (solo en respuesta de detalle por id). */
  sacas?: Saca[];

  /**
   * SCD2 (V67): id de la version inmutable del consignatario que viaja en
   * el despacho. Si tiene valor, los datos del consignatario son los del
   * snapshot historico, independientemente de cambios posteriores en el
   * maestro.
   */
  consignatarioVersionId?: number | null;
  /** SCD2: id de la version inmutable de la agencia destino. */
  agenciaVersionId?: number | null;
  /** SCD2: id de la version inmutable de la agencia de courierEntrega destino. */
  agenciaCourierEntregaVersionId?: number | null;
  /** SCD2: cuando se congelo el snapshot de destino del despacho. */
  destinoCongeladoEn?: string | null;
}

export interface DespachoCreateRequest {
  numeroGuia: string;
  courierEntregaId: number;
  tipoEntrega: TipoEntrega;
  consignatarioId?: number;
  agenciaId?: number;
  agenciaCourierEntregaId?: number;
  observaciones?: string;
  codigoPrecinto?: string;
  fechaHora?: string;
  sacaIds?: number[];
}

export interface SacaCreateRequest {
  numeroOrden: string;
  pesoLbs?: number;
  pesoKg?: number;
  tamanio?: TamanioSaca;
}
