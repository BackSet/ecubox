import type { EstadoPagoConsolidado } from '@/types/envio-consolidado';

export interface ConfigTarifaDistribucion {
  id?: number;
  kgIncluidos: number;
  precioFijo: number;
  precioKgAdicional: number;
  updatedAt?: string;
  updatedByUsername?: string;
}

export interface ConfigTarifaDistribucionRequest {
  kgIncluidos: number;
  precioFijo: number;
  precioKgAdicional: number;
}

// ----------------------------------------------------------------------------
// Sección A — Costo al proveedor por envío consolidado
// ----------------------------------------------------------------------------

export interface LiquidacionConsolidadoLinea {
  id: number;
  envioConsolidadoId: number;
  envioConsolidadoCodigo: string;
  envioConsolidadoCerrado?: boolean;
  envioConsolidadoTotalPaquetes?: number;
  envioConsolidadoPesoTotalLbs?: number;
  costoProveedor: number;
  ingresoCliente: number;
  margenLinea: number;
  notas?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LiquidacionConsolidadoLineaRequest {
  /** ID de un consolidado existente. Mutuamente excluyente con `envioConsolidadoCodigo`. */
  envioConsolidadoId?: number;
  /**
   * Código (guía) del consolidado. Si no existe en el sistema, el backend
   * lo crea automáticamente sin paquetes y lo asocia a la línea.
   */
  envioConsolidadoCodigo?: string;
  costoProveedor: number;
  ingresoCliente: number;
  notas?: string;
}

// ----------------------------------------------------------------------------
// Sección B — Costo del courier de entrega por despacho
// ----------------------------------------------------------------------------

export interface LiquidacionDespachoLinea {
  id: number;
  despachoId: number;
  despachoNumeroGuia?: string;
  despachoCourierEntregaNombre?: string;
  despachoFechaHora?: string;
  pesoKg: number;
  pesoLbs: number;
  kgIncluidos: number;
  precioFijo: number;
  precioKgAdicional: number;
  costoCalculado: number;
  notas?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LiquidacionDespachoLineaRequest {
  despachoId: number;
  pesoKg: number;
  kgIncluidos: number;
  precioFijo: number;
  precioKgAdicional: number;
  notas?: string;
}

// ----------------------------------------------------------------------------
// Documento de liquidación
// ----------------------------------------------------------------------------

export interface Liquidacion {
  id: number;
  codigo: string;
  fechaDocumento: string;
  periodoDesde?: string;
  periodoHasta?: string;
  notas?: string;
  margenBruto: number;
  totalCostoDistribucion: number;
  ingresoNeto: number;
  estadoPago: EstadoPagoConsolidado;
  fechaPago?: string;
  pagadoPorUsername?: string;
  createdAt?: string;
  updatedAt?: string;
  consolidados: LiquidacionConsolidadoLinea[];
  despachos: LiquidacionDespachoLinea[];
  tarifaDefault?: ConfigTarifaDistribucion;
}

export interface LiquidacionResumen {
  id: number;
  codigo: string;
  fechaDocumento: string;
  periodoDesde?: string;
  periodoHasta?: string;
  margenBruto: number;
  totalCostoDistribucion: number;
  ingresoNeto: number;
  estadoPago: EstadoPagoConsolidado;
  fechaPago?: string;
  totalConsolidados: number;
  totalDespachos: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LiquidacionCrearRequest {
  fechaDocumento?: string;
  periodoDesde?: string;
  periodoHasta?: string;
  notas?: string;
}

export interface LiquidacionHeaderRequest {
  fechaDocumento: string;
  periodoDesde?: string;
  periodoHasta?: string;
  notas?: string;
}

// ----------------------------------------------------------------------------
// Listados / filtros
// ----------------------------------------------------------------------------

export type LiquidacionEstadoPagoFiltro = 'TODOS' | EstadoPagoConsolidado;

export interface LiquidacionListaParams {
  desdeDocumento?: string;
  hastaDocumento?: string;
  desdePago?: string;
  hastaPago?: string;
  estadoPago?: EstadoPagoConsolidado;
  q?: string;
  page?: number;
  size?: number;
}

// ----------------------------------------------------------------------------
// Selectores de elementos disponibles
// ----------------------------------------------------------------------------

export interface EnvioConsolidadoDisponible {
  id: number;
  codigo: string;
  cerrado: boolean;
  fechaCerrado?: string;
  totalPaquetes?: number;
  pesoTotalLbs?: number;
  createdAt?: string;
}

export interface DespachoDisponible {
  id: number;
  numeroGuia: string;
  courierEntregaNombre?: string;
  fechaHora?: string;
  pesoSugeridoLbs: number;
  pesoSugeridoKg: number;
}
