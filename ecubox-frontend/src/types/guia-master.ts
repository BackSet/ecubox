import type { Paquete } from '@/types/paquete';

/**
 * Estados del agregado guia_master alineados con el enum del backend
 * tras la migracion V66. Los valores se renombraron para ser mas
 * descriptivos para el operario y se agregaron CANCELADA y EN_REVISION.
 */
export type EstadoGuiaMaster =
  | 'EN_ESPERA_RECEPCION'
  | 'RECEPCION_PARCIAL'
  | 'RECEPCION_COMPLETA'
  | 'DESPACHO_PARCIAL'
  | 'DESPACHO_COMPLETADO'
  | 'DESPACHO_INCOMPLETO'
  | 'CANCELADA'
  | 'EN_REVISION';

/** DESPACHO_COMPLETADO | DESPACHO_INCOMPLETO_MANUAL | DESPACHO_INCOMPLETO_TIMEOUT | CANCELACION */
export type TipoCierreGuiaMaster =
  | 'DESPACHO_COMPLETADO'
  | 'DESPACHO_INCOMPLETO_MANUAL'
  | 'DESPACHO_INCOMPLETO_TIMEOUT'
  | 'CANCELACION';

export type TipoCambioEstadoGuiaMaster =
  | 'CREACION'
  | 'RECALCULO_AUTOMATICO'
  | 'CIERRE_MANUAL_FALTANTE'
  | 'AUTO_CIERRE_TIMEOUT'
  | 'CANCELACION'
  | 'MARCAR_REVISION'
  | 'SALIR_REVISION'
  | 'REAPERTURA';

export interface GuiaMaster {
  id: number;
  trackingBase: string;
  totalPiezasEsperadas: number | null;
  consignatarioId?: number | null;
  consignatarioNombre?: string | null;
  consignatarioTelefono?: string | null;
  consignatarioDireccion?: string | null;
  consignatarioProvincia?: string | null;
  consignatarioCanton?: string | null;
  /**
   * TRUE cuando los datos del consignatario provienen de un fallback
   * (primera pieza con consignatario asignado) en vez del propio
   * `consignatario` de la guia. Util para mostrar un badge "inferido"
   * en lugar de "Sin asignar" cuando la guia no tiene consignatario propio
   * pero las piezas si.
   */
  consignatarioInferido?: boolean | null;
  /**
   * SCD2 (V67): id de la version inmutable del consignatario congelada en
   * la guia al primer despacho de pieza. Si tiene valor, los campos
   * consignatarioNombre/Direccion/etc. se sirven desde el snapshot historico
   * y no se pueden cambiar reasignando el consignatario.
   */
  consignatarioVersionId?: number | null;
  /** SCD2: cuando se congelaron los datos del consignatario. */
  consignatarioCongeladoEn?: string | null;
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
  // Auditoria de cierre (V66)
  cerradaEn?: string | null;
  cerradaPorUsuarioId?: number | null;
  cerradaPorUsuarioNombre?: string | null;
  tipoCierre?: TipoCierreGuiaMaster | null;
  motivoCierre?: string | null;
  piezas?: Paquete[];
}

export interface GuiaMasterEstadoHistorial {
  id: number;
  guiaMasterId: number;
  estadoAnterior: EstadoGuiaMaster | null;
  estadoNuevo: EstadoGuiaMaster;
  tipoCambio: TipoCambioEstadoGuiaMaster;
  motivo?: string | null;
  cambiadoPorUsuarioId?: number | null;
  cambiadoPorUsuarioNombre?: string | null;
  cambiadoEn: string;
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
  totalCanceladas?: number;
  totalEnRevision?: number;
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
  totalConsignatarios: number;
  piezasEnTransito: number;
  guiasRecientes: GuiaMaster[];
  guiasProximasACerrar: GuiaMaster[];
}

export interface GuiaMasterCreateRequest {
  trackingBase: string;
  totalPiezasEsperadas?: number | null;
  consignatarioId?: number | null;
}

export interface GuiaMasterUpdateRequest {
  trackingBase?: string;
  totalPiezasEsperadas?: number | null;
  consignatarioId?: number | null;
}

export interface MiGuiaCreateRequest {
  trackingBase: string;
  consignatarioId: number;
}

export interface GuiaMasterCerrarConFaltanteRequest {
  motivo?: string;
}

export interface GuiaMasterCancelarRequest {
  motivo: string;
}

export interface GuiaMasterRevisionRequest {
  motivo?: string;
}

export interface GuiaMasterReabrirRequest {
  motivo: string;
}
