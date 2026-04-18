package com.ecubox.ecubox_backend.enums;

/**
 * Estado agregado de la guía del consolidador (guia_master).
 * Se recomputa en función del estado de sus piezas (paquete).
 */
public enum EstadoGuiaMaster {
    /** Aún no se registran todas las piezas esperadas. */
    INCOMPLETA,
    /** Al menos una pieza recibida, pero faltan otras. */
    PARCIAL_RECIBIDA,
    /** Todas las piezas esperadas están registradas y recibidas. */
    COMPLETA_RECIBIDA,
    /** Al menos una pieza despachada, faltan piezas por despachar o recibir. */
    PARCIAL_DESPACHADA,
    /** Todas las piezas esperadas fueron despachadas. */
    CERRADA,
    /** Cerrada manualmente aceptando que algunas piezas nunca llegaron. */
    CERRADA_CON_FALTANTE
}
