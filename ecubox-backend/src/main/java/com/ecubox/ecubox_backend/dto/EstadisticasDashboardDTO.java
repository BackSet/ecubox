package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.GranularidadEstadisticas;
import com.ecubox.ecubox_backend.enums.PresetPeriodoEstadisticas;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Panel estadístico. Separa semánticamente:
 * <ul>
 *   <li><b>{@code resultados}</b>: métricas históricas del periodo, sus series y
 *       comparaciones contra el periodo anterior equivalente.</li>
 *   <li><b>{@code estadoActual}</b>: fotografía operativa del momento
 *       ({@code generadoEn}); no se compara contra historia.</li>
 * </ul>
 */
public record EstadisticasDashboardDTO(
        LocalDateTime generadoEn,
        GranularidadEstadisticas granularidad,
        boolean periodoParcial,
        Periodo periodo,
        Periodo periodoAnterior,
        int diasMaxSinDespachar,
        ResultadosPeriodo resultados,
        EstadoOperativoActual estadoActual
) {

    /** Rango normalizado {@code [desde, hastaExclusivo)}; {@code hastaInclusivo} se ofrece para UI. */
    public record Periodo(
            PresetPeriodoEstadisticas preset,
            LocalDate desde,
            LocalDate hastaExclusivo,
            LocalDate hastaInclusivo
    ) {
    }

    /** Métrica histórica con su comparación contra el periodo anterior equivalente. */
    public record MetricaComparable(
            BigDecimal actual,
            BigDecimal anterior,
            BigDecimal diferencia,
            Double variacionPct,
            boolean comparacionDisponible
    ) {
    }

    /**
     * Resultados históricos del periodo. Las métricas de despacho se basan en la
     * primera transición auditable del paquete al estado de despacho
     * (ver {@code PaqueteEstadoEventoRepository}), no en {@code despacho.fecha_hora}.
     *
     * Las métricas financieras ({@code margenBruto}, {@code costoDistribucion},
     * {@code ingresoNeto}) son ESTIMACIONES calculadas con el peso de los paquetes
     * registrados en el periodo y tasas históricas de liquidaciones; no son
     * valores contables reales.
     */
    public record ResultadosPeriodo(
            MetricaComparable paquetesDespachados,
            MetricaComparable paquetesRegistrados,
            MetricaComparable pesoDespachadoLbs,
            MetricaComparable tiempoPromedioDespachoDias,
            MetricaComparable margenBruto,
            MetricaComparable costoDistribucion,
            MetricaComparable ingresoNeto,
            List<SeriePunto> paquetesDespachadosSerie,
            List<SeriePunto> registrosSerie
    ) {
    }

    /** Punto de serie temporal con clave compatible con la granularidad. */
    public record SeriePunto(
            String periodo,
            String etiqueta,
            long total,
            long paquetes,
            BigDecimal pesoLbs
    ) {
    }

    public record EstadoOperativoActual(
            long pendientesDespacho,
            long demoradosSinDespachar,
            long entregadosSinDespacho,
            long excepcionesOperativas,
            List<DistribucionEstado> distribucion,
            List<PaqueteDemorado> paquetesDemorados,
            List<PaqueteInconsistente> paquetesEntregadosSinDespacho,
            List<ExcepcionOperativa> excepciones
    ) {
    }

    public record DistribucionEstado(
            Long estadoId,
            String codigo,
            String nombre,
            long total
    ) {
    }

    public record PaqueteDemorado(
            Long id,
            String numeroGuia,
            String referencia,
            String guiaMaster,
            Long guiaMasterId,
            String consignatario,
            String estado,
            LocalDateTime registradoEn,
            long diasSinDespachar,
            long diasAtraso
    ) {
    }

    public record PaqueteInconsistente(
            Long id,
            String numeroGuia,
            String referencia,
            String guiaMaster,
            Long guiaMasterId,
            String consignatario,
            String estado,
            LocalDateTime registradoEn
    ) {
    }

    public record ExcepcionOperativa(
            String severidad,
            String modulo,
            String entidadTipo,
            Long entidadId,
            String referencia,
            String codigo,
            String titulo,
            String detalle,
            String ruta
    ) {
    }
}
