import type { EstadoEnvioConsolidadoOperativo } from '@/types/envio-consolidado';
import type { EstadoGuiaMaster } from '@/types/guia-master';

export interface Paquete {
  id: number;
  numeroGuia: string;
  ref?: string;
  pesoLbs?: number;
  pesoKg?: number;
  contenido?: string;
  estadoRastreoId?: number;
  estadoRastreoNombre?: string;
  estadoRastreoCodigo?: string;
  estadoRastreoTipoFlujo?: 'NORMAL' | 'ALTERNO';
  /** Orden del estado de rastreo actual; permite filtrar elegibilidad para aplicar estado. */
  estadoRastreoOrden?: number;
  consignatarioId: number;
  consignatarioNombre?: string;
  consignatarioDireccion?: string;
  consignatarioProvincia?: string;
  consignatarioCanton?: string;
  consignatarioTelefono?: string;
  sacaId?: number;
  despachoId?: number;
  despachoNumeroGuia?: string;
  fechaEstadoDesde?: string;
  diasMaxRetiro?: number;
  diasTranscurridos?: number;
  diasRestantes?: number;
  diasAtrasoRetiro?: number;
  paqueteVencido?: boolean;
  enFlujoAlterno?: boolean;
  motivoAlterno?: string;
  bloqueado?: boolean;
  revisionActiva?: RevisionPaquete;
  createdAt?: string;
  // Información de la guía master (carrier) a la que pertenece esta pieza
  guiaMasterId?: number;
  guiaMasterTrackingBase?: string;
  guiaMasterEstadoGlobal?: EstadoGuiaMaster;
  guiaMasterTotalPiezas?: number;
  piezaNumero?: number;
  piezaTotal?: number;
  // Envío consolidado (interno del operario) al que pertenece este paquete.
  envioConsolidadoId?: number;
  envioConsolidadoCodigo?: string;
  /** true si el envio consolidado al que pertenece ya fue enviado desde USA. */
  envioConsolidadoCerrado?: boolean;
  /** Estado operativo derivado del envío consolidado; null si no tiene consolidado. */
  envioConsolidadoEstadoOperativo?: EstadoEnvioConsolidadoOperativo | null;
}

export type BandejaPaquete = 'todos' | 'operativos' | 'en_revision';
export type EstadoRevisionPaquete = 'EN_REVISION' | 'RESUELTA';
export type MotivoRevisionPaquete =
  | 'DATOS_INCONSISTENTES'
  | 'PESO_O_DIMENSIONES'
  | 'CONSIGNATARIO_INCORRECTO'
  | 'GUIA_INCORRECTA'
  | 'CONTENIDO_RESTRINGIDO'
  | 'OTRO';

export interface RevisionPaquete {
  id: number;
  paqueteId: number;
  motivo: MotivoRevisionPaquete;
  estado: EstadoRevisionPaquete;
  observacionInicio?: string;
  fechaInicio: string;
  iniciadoPorUsuarioId: number;
  iniciadoPorUsername?: string;
  fechaResolucion?: string;
  resueltoPorUsuarioId?: number;
  resueltoPorUsername?: string;
  observacionResolucion?: string;
  version: number;
}

export interface PaqueteCreateRequest {
  consignatarioId: number;
  contenido?: string;
  pesoLbs?: number;
  pesoKg?: number;
  guiaMasterId?: number;
  piezaNumero?: number;
}

export interface PaqueteUpdateRequest {
  consignatarioId: number;
  contenido?: string;
  pesoLbs?: number;
  pesoKg?: number;
  ref?: string;
  guiaMasterId?: number;
  piezaNumero?: number;
}

/**
 * Resumen liviano del listado de paquetes (KPIs del universo, conteos por chip
 * respetando filtros estructurales y opciones de filtro). Sustituye la descarga
 * del dataset completo en el cliente; la tabla se sirve por `/page`.
 */
export interface PaqueteResumen {
  total: number;
  conPeso: number;
  sinPeso: number;
  vencidos: number;
  consignatariosDistintos: number;
  chips: {
    todos: number;
    sinPeso: number;
    conPeso: number;
    sinGuiaMaster: number;
    vencidos: number;
  };
  /** Conteos por bandeja sobre el universo visible (para las pestañas). */
  bandejas: {
    todos: number;
    operativos: number;
    enRevision: number;
  };
  estados: { codigo: string; nombre: string }[];
  consignatarios: { id: number; nombre: string }[];
  codigosEnvio: string[];
  guiasMaster: { id: number; trackingBase: string }[];
}
