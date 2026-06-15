package com.ecubox.ecubox_backend.enums;

/**
 * Estado de disponibilidad de una métrica de estadísticas. Distingue un cero
 * real de la ausencia de datos para no usar 0 como fallback universal.
 */
public enum DisponibilidadMetrica {
    /** Hay eventos que cubren todo el periodo consultado: el valor es fiable. */
    COMPLETA,
    /** Hay eventos pero la cobertura empieza después del inicio del periodo. */
    PARCIAL,
    /** El hito de despacho no está configurado y no hay eventos para calcular. */
    SIN_CONFIGURACION,
    /** No existe ningún evento histórico de despacho (aún). */
    SIN_HISTORIAL,
    /** La métrica no se puede calcular por una causa no clasificada. */
    NO_CALCULABLE
}
