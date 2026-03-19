import type { Paquete } from '@/types/paquete';

export type TipoEntrega = 'DOMICILIO' | 'AGENCIA' | 'AGENCIA_DISTRIBUIDOR';

export interface AgenciaDistribuidor {
  id: number;
  distribuidorId: number;
  distribuidorNombre?: string;
  codigo: string;
  etiqueta?: string;
  provincia?: string;
  canton?: string;
  direccion?: string;
  horarioAtencion?: string;
  diasMaxRetiro?: number;
  tarifa: number;
}

export interface AgenciaDistribuidorRequest {
  distribuidorId: number;
  codigo?: string;
  provincia?: string;
  canton?: string;
  direccion?: string;
  horarioAtencion?: string;
  diasMaxRetiro?: number;
  tarifa: number;
}

export type TamanioSaca = 'INDIVIDUAL' | 'PEQUENO' | 'MEDIANO' | 'GRANDE';

export interface Distribuidor {
  id: number;
  nombre: string;
  codigo: string;
  email?: string;
  tarifaEnvio?: number;
  horarioReparto?: string;
  paginaTracking?: string;
  diasMaxRetiroDomicilio?: number;
}

export interface DistribuidorRequest {
  nombre: string;
  codigo: string;
  email?: string;
  tarifaEnvio: number;
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
  tarifaServicio?: number;
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
  tarifaServicio: number;
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
  distribuidorId: number;
  distribuidorNombre?: string;
  tipoEntrega: TipoEntrega;
  destinatarioFinalId?: number;
  destinatarioNombre?: string;
  destinatarioDireccion?: string;
  destinatarioTelefono?: string;
  agenciaId?: number;
  agenciaNombre?: string;
  agenciaDistribuidorId?: number;
  agenciaDistribuidorNombre?: string;
  sacaIds?: number[];
  /** Sacas con paquetes (solo en respuesta de detalle por id). */
  sacas?: Saca[];
}

export interface DespachoCreateRequest {
  numeroGuia: string;
  distribuidorId: number;
  tipoEntrega: TipoEntrega;
  destinatarioFinalId?: number;
  agenciaId?: number;
  agenciaDistribuidorId?: number;
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
