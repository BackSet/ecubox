import type { Paquete } from '@/types/paquete';

export type EstadoGuiaMaster =
  | 'INCOMPLETA'
  | 'PARCIAL_RECIBIDA'
  | 'COMPLETA_RECIBIDA'
  | 'PARCIAL_DESPACHADA'
  | 'CERRADA'
  | 'CERRADA_CON_FALTANTE';

export interface GuiaMaster {
  id: number;
  trackingBase: string;
  totalPiezasEsperadas: number | null;
  destinatarioFinalId?: number | null;
  destinatarioNombre?: string | null;
  destinatarioTelefono?: string | null;
  destinatarioDireccion?: string | null;
  destinatarioProvincia?: string | null;
  destinatarioCanton?: string | null;
  clienteUsuarioId?: number | null;
  clienteUsuarioNombre?: string | null;
  piezasRegistradas?: number;
  piezasRecibidas?: number;
  piezasDespachadas?: number;
  estadoGlobal: EstadoGuiaMaster;
  createdAt?: string;
  fechaPrimeraRecepcion?: string;
  fechaPrimeraPiezaDespachada?: string;
  minPiezasParaDespachoParcial?: number;
  listaParaDespachoParcial?: boolean;
  despachoParcialEnCurso?: boolean;
  piezas?: Paquete[];
}

export interface GuiaMasterConfirmarDespachoParcialRequest {
  piezaId: number;
  motivo?: string;
}

export interface GuiaMasterDashboard {
  conteosPorEstado: Record<EstadoGuiaMaster, number>;
  totalActivas: number;
  totalCerradas: number;
  totalCerradasConFaltante: number;
  minPiezasParaDespachoParcial: number;
  diasParaAutoCierre: number;
  requiereConfirmacionDespachoParcial: boolean;
  topAntiguasSinCompletar: GuiaMaster[];
}

export interface MiInicioDashboard {
  conteosPorEstado: Record<EstadoGuiaMaster, number>;
  totalGuias: number;
  totalGuiasActivas: number;
  totalGuiasCerradas: number;
  totalGuiasSinTotalDefinido: number;
  totalDestinatarios: number;
  piezasEnTransito: number;
  guiasRecientes: GuiaMaster[];
  guiasProximasACerrar: GuiaMaster[];
}

export interface GuiaMasterCreateRequest {
  trackingBase: string;
  totalPiezasEsperadas?: number | null;
  destinatarioFinalId?: number | null;
}

export interface GuiaMasterUpdateRequest {
  trackingBase?: string;
  totalPiezasEsperadas?: number | null;
  destinatarioFinalId?: number | null;
}

export interface MiGuiaCreateRequest {
  trackingBase: string;
  destinatarioFinalId: number;
}

export interface GuiaMasterCerrarConFaltanteRequest {
  motivo?: string;
}
