export interface Paquete {
  id: number;
  numeroGuia: string;
  numeroGuiaEnvio?: string;
  ref?: string;
  pesoLbs?: number;
  pesoKg?: number;
  contenido?: string;
  estadoRastreoId?: number;
  estadoRastreoNombre?: string;
  estadoRastreoCodigo?: string;
  destinatarioFinalId: number;
  destinatarioNombre?: string;
  destinatarioDireccion?: string;
  destinatarioProvincia?: string;
  destinatarioCanton?: string;
  destinatarioTelefono?: string;
  sacaId?: number;
  despachoId?: number;
  despachoNumeroGuia?: string;
  enFlujoAlterno?: boolean;
  motivoAlterno?: string;
  bloqueado?: boolean;
}

export interface PaqueteCreateRequest {
  numeroGuia: string;
  destinatarioFinalId: number;
  contenido?: string;
  pesoLbs?: number;
  pesoKg?: number;
  numeroGuiaEnvio?: string;
}

export interface PaqueteUpdateRequest {
  numeroGuia: string;
  destinatarioFinalId: number;
  contenido?: string;
  pesoLbs?: number;
  pesoKg?: number;
  numeroGuiaEnvio?: string;
  ref?: string;
}
