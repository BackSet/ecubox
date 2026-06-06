export interface EstadisticasResumen {
  totalDespachos: number;
  paquetesDespachados: number;
  paquetesRegistrados: number;
  pendientesDespacho: number;
  demoradosSinDespachar: number;
  entregadosSinDespacho: number;
  excepcionesOperativas: number;
  pesoDespachadoLbs: number;
  /** Promedio de días entre registro y despacho en el período (null si no hay datos). */
  tiempoPromedioDespachoDias?: number | null;
  margenBruto: number;
  costoDistribucion: number;
  ingresoNetoAproximado: number;
}

export interface EstadisticaSerieMensual {
  periodo: string;
  etiqueta: string;
  total: number;
  paquetes: number;
  pesoLbs: number;
}

export interface EstadisticaDistribucionEstado {
  estadoId: number;
  codigo: string;
  nombre: string;
  total: number;
}

export interface PaqueteDemorado {
  id: number;
  numeroGuia: string;
  referencia: string;
  guiaMaster?: string | null;
  guiaMasterId?: number | null;
  consignatario?: string | null;
  estado?: string | null;
  registradoEn: string;
  diasSinDespachar: number;
  diasAtraso: number;
}

export interface PaqueteInconsistente {
  id: number;
  numeroGuia: string;
  referencia: string;
  guiaMaster?: string | null;
  guiaMasterId?: number | null;
  consignatario?: string | null;
  estado?: string | null;
  registradoEn: string;
}

export type SeveridadExcepcion = 'ALTA' | 'MEDIA' | 'BAJA';

export interface ExcepcionOperativa {
  severidad: SeveridadExcepcion;
  modulo: string;
  entidadTipo: string;
  entidadId: number;
  referencia: string;
  codigo: string;
  titulo: string;
  detalle: string;
  ruta: string;
}

export interface EstadisticasDashboard {
  generadoEn: string;
  periodoDesde: string;
  periodoHasta: string;
  diasMaxSinDespachar: number;
  resumen: EstadisticasResumen;
  despachosPorMes: EstadisticaSerieMensual[];
  paquetesRegistradosPorMes: EstadisticaSerieMensual[];
  paquetesPorEstado: EstadisticaDistribucionEstado[];
  paquetesDemorados: PaqueteDemorado[];
  paquetesEntregadosSinDespacho: PaqueteInconsistente[];
  excepcionesOperativas: ExcepcionOperativa[];
}
