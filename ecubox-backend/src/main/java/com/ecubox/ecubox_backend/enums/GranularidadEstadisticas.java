package com.ecubox.ecubox_backend.enums;

/**
 * Granularidad temporal de las series de estadísticas. El {@code truncUnit}
 * corresponde a la unidad aceptada por {@code date_trunc(text, timestamp)} de
 * PostgreSQL, de modo que la agregación se resuelve en base de datos y nunca
 * agrupando localmente datos incompletos.
 */
public enum GranularidadEstadisticas {

    DIARIA("day"),
    SEMANAL("week"),
    MENSUAL("month"),
    TRIMESTRAL("quarter");

    private final String truncUnit;

    GranularidadEstadisticas(String truncUnit) {
        this.truncUnit = truncUnit;
    }

    public String getTruncUnit() {
        return truncUnit;
    }
}
