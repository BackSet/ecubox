package com.ecubox.ecubox_backend.enums;

/**
 * Vigencia DERIVADA de una campaña publicada según sus fechas y el momento
 * actual. NO se persiste: se calcula en el servicio.
 */
public enum VigenciaCampaniaLanding {
    PROGRAMADA,
    VIGENTE,
    VENCIDA
}
