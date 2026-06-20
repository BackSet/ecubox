package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Resumen agregado de los estados de rastreo de los paquetes de un envío
 * consolidado. Se calcula por lote (una sola consulta agrupada por consolidado
 * y estado para toda la página) y se adjunta al listado para una lectura
 * operativa compacta: total, badges por estado (ordenados por el orden canónico
 * del tracking), cuántos requieren atención y si el consolidado es mixto.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumenEstadosPaquetesConsolidadoDTO {

    private int totalPaquetes;
    private List<EstadoPaqueteResumenItemDTO> estados;
    /** Paquetes cuyo estado requiere atención (flujo alterno o sin estado). */
    private int cantidadRequiereAtencion;
    /** true si los paquetes tienen más de un estado actual distinto. */
    private boolean estadosMixtos;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EstadoPaqueteResumenItemDTO {
        /** id del estado de rastreo; {@code null} representa "Sin estado". */
        private Long estadoId;
        private String codigo;
        private String nombre;
        private int cantidad;
        /** Orden canónico del tracking ({@code null} si el estado no lo define). */
        private Integer ordenTracking;
        /** {@code NORMAL} / {@code ALTERNO} (o {@code null} si sin estado). */
        private String tipoFlujo;
        /** true si este estado requiere atención (flujo alterno o sin estado). */
        private boolean requiereAtencion;
        /** Muestra acotada de paquetes de este estado (máximo 3 por backend). */
        private List<PaquetePreviewDTO> paquetesPreview;
        /** true si hay más paquetes de este estado que los incluidos en el preview. */
        private boolean hayMas;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaquetePreviewDTO {
        private Long paqueteId;
        private String codigo;
        private Long guiaId;
        private String guiaCodigo;
        private String piezaLabel;
    }
}
