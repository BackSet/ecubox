export type GranularidadEstadisticas = 'DIARIA' | 'SEMANAL' | 'MENSUAL' | 'TRIMESTRAL';

export type PresetPeriodoEstadisticas =
  | 'ESTE_MES'
  | 'MES_ANTERIOR'
  | 'MES_ESPECIFICO'
  | 'ULTIMOS_3_MESES'
  | 'ULTIMOS_6_MESES'
  | 'ULTIMOS_12_MESES'
  | 'ULTIMOS_24_MESES'
  | 'ESTE_ANIO'
  | 'ANIO_ANTERIOR'
  | 'RANGO_PERSONALIZADO';

/** Métrica histórica con su comparación contra el periodo anterior equivalente. */
export interface MetricaComparable {
  actual: number | null;
  anterior: number | null;
  diferencia: number | null;
  variacionPct: number | null;
  comparacionDisponible: boolean;
}

/** Punto de serie temporal; la clave `periodo` es compatible con la granularidad. */
export interface EstadisticaSeriePunto {
  periodo: string;
  etiqueta: string;
  total: number;
  paquetes: number;
  pesoLbs: number;
}

export interface PeriodoEstadisticas {
  preset: PresetPeriodoEstadisticas;
  desde: string;
  hastaExclusivo: string;
  hastaInclusivo: string;
}

export interface EstadisticasResultadosPeriodo {
  despachos: MetricaComparable;
  paquetesDespachados: MetricaComparable;
  paquetesRegistrados: MetricaComparable;
  pesoDespachadoLbs: MetricaComparable;
  tiempoPromedioDespachoDias: MetricaComparable;
  margenBruto: MetricaComparable;
  costoDistribucion: MetricaComparable;
  ingresoNeto: MetricaComparable;
  despachosSerie: EstadisticaSeriePunto[];
  registrosSerie: EstadisticaSeriePunto[];
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

/** Fotografía operativa actual; no se compara contra historia. */
export interface EstadoOperativoActual {
  pendientesDespacho: number;
  demoradosSinDespachar: number;
  entregadosSinDespacho: number;
  excepcionesOperativas: number;
  distribucion: EstadisticaDistribucionEstado[];
  paquetesDemorados: PaqueteDemorado[];
  paquetesEntregadosSinDespacho: PaqueteInconsistente[];
  excepciones: ExcepcionOperativa[];
}

export interface EstadisticasDashboard {
  generadoEn: string;
  granularidad: GranularidadEstadisticas;
  periodoParcial: boolean;
  periodo: PeriodoEstadisticas;
  periodoAnterior: PeriodoEstadisticas;
  diasMaxSinDespachar: number;
  resultados: EstadisticasResultadosPeriodo;
  estadoActual: EstadoOperativoActual;
}
