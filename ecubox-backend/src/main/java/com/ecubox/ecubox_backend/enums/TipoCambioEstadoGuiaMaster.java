package com.ecubox.ecubox_backend.enums;

/**
 * Origen de un registro en {@code guia_master_estado_historial}.
 * Permite distinguir cambios automaticos por recalculo, cierres
 * manuales, cancelaciones, pausas administrativas y reaperturas.
 */
public enum TipoCambioEstadoGuiaMaster {
    /** Snapshot inicial al crearse la guia (o al backfill historico). */
    CREACION,
    /** El estado se recalculo a partir del avance de las piezas. */
    RECALCULO_AUTOMATICO,
    /** Un operario cerro manualmente la guia aceptando que faltan piezas. */
    CIERRE_MANUAL_FALTANTE,
    /** El job de timeout cerro la guia automaticamente por inactividad. */
    AUTO_CIERRE_TIMEOUT,
    /** Un operario cancelo la guia (anulacion administrativa). */
    CANCELACION,
    /** Un operario marco la guia como EN_REVISION (pausa). */
    MARCAR_REVISION,
    /** Un operario libero la guia de EN_REVISION y volvio al flujo derivado. */
    SALIR_REVISION,
    /** Un operario reabrio una guia previamente terminal y volvio al flujo derivado. */
    REAPERTURA
}
