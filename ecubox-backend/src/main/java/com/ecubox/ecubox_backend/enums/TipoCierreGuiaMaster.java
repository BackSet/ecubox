package com.ecubox.ecubox_backend.enums;

/**
 * Causa por la cual una {@code guia_master} entro en un estado terminal.
 * Se persiste en {@code guia_master.tipo_cierre} junto con la fecha,
 * el actor y el motivo libre.
 */
public enum TipoCierreGuiaMaster {
    /** Todas las piezas fueron despachadas. Cierre exitoso (puede provenir de recalculo). */
    DESPACHO_COMPLETADO,
    /** Cerrado manualmente por un operario aceptando piezas faltantes. */
    DESPACHO_INCOMPLETO_MANUAL,
    /** Cerrado automaticamente por el job de timeout (inactividad despues del primer despacho). */
    DESPACHO_INCOMPLETO_TIMEOUT,
    /** Anulacion administrativa antes de despachar. */
    CANCELACION
}
