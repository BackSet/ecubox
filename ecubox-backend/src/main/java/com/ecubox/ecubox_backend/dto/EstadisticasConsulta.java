package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.GranularidadEstadisticas;
import com.ecubox.ecubox_backend.enums.PresetPeriodoEstadisticas;

import java.time.LocalDate;

/**
 * Parámetros crudos de consulta de estadísticas tal como llegan del controlador.
 *
 * <p>Reglas de prioridad (resueltas en {@code PeriodoEstadisticasResolver}):</p>
 * <ol>
 *   <li>Si llegan {@code desde} y {@code hasta}, se usa el contrato de rango
 *       explícito ({@code hasta} es exclusivo).</li>
 *   <li>Si llega {@code preset}, se resuelve ese preset.</li>
 *   <li>Si solo llega {@code meses}, se conserva el comportamiento heredado.</li>
 *   <li>Si no llega nada, se usa el preset por defecto.</li>
 * </ol>
 */
public record EstadisticasConsulta(
        PresetPeriodoEstadisticas preset,
        Integer anio,
        Integer mes,
        LocalDate desde,
        LocalDate hasta,
        GranularidadEstadisticas granularidad,
        Integer meses
) {
}
