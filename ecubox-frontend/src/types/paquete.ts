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
