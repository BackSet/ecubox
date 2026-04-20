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
  // Información de la guía master (carrier) a la que pertenece esta pieza
  guiaMasterId?: number;
  guiaMasterTrackingBase?: string;
  guiaMasterEstadoGlobal?: string;
  guiaMasterTotalPiezas?: number;
  piezaNumero?: number;
  piezaTotal?: number;
  // Envío consolidado (interno del operario) al que pertenece este paquete.
  envioConsolidadoId?: number;
  envioConsolidadoCodigo?: string;
  /** true si el envio consolidado al que pertenece ya esta cerrado. */
  envioConsolidadoCerrado?: boolean;
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
