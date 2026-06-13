package com.ecubox.ecubox_backend.enums;

/**
 * Presets de periodo soportados por {@code /api/estadisticas}. La resolución de
 * cada preset a un rango {@code [desde, hasta)} en zona {@code America/Guayaquil}
 * vive en {@code PeriodoEstadisticasResolver}.
 */
public enum PresetPeriodoEstadisticas {
    ESTE_MES,
    MES_ANTERIOR,
    MES_ESPECIFICO,
    ULTIMOS_3_MESES,
    ULTIMOS_6_MESES,
    ULTIMOS_12_MESES,
    ULTIMOS_24_MESES,
    ESTE_ANIO,
    ANIO_ANTERIOR,
    RANGO_PERSONALIZADO
}
