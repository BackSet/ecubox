package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Reporte de una corrida de auditoría/reparación del estado de "llegada a
 * bodega" de paquetes históricos. Sirve tanto para {@code dry-run} (no escribe)
 * como para {@code execute}. Distingue avanzados de omitidos por categoría, sin
 * convertir omisiones en degradaciones.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReparacionBodegaReporteDTO {

    /** Identificador único de la corrida (auditoría/event_source). */
    private String repairRunId;
    /** true si fue dry-run (no escribió nada). */
    private boolean dryRun;
    private int batchSize;
    /** Tope opcional de paquetes a procesar en esta corrida (ejecución controlada). */
    private Integer maxPaquetes;

    /** Paquetes evaluados (todos los candidatos vistos en la corrida). */
    private int totalEvaluados;

    /** Avanzados al estado de bodega (en dry-run: que avanzarían). */
    private int reparados;
    /** Ya estaban correctos (mismo estado). */
    private int yaCorrectos;
    /** Ya tenían evento de reparación previo (idempotencia). */
    private int yaReparados;
    /** Omitidos por estar en estado posterior/terminal. */
    private int posteriores;
    /** Omitidos por estar en flujo alterno. */
    private int alternos;
    /** Omitidos por estar bloqueados o en revisión. */
    private int bloqueados;
    /** Omitidos por no tener fecha histórica verificable. */
    private int sinFecha;
    /** Omitidos por estado de bodega no configurado/activo. */
    private int destinoNoConfigurado;
    /** Paquetes candidatos que ya no existían. */
    private int noEncontrados;
    /** Errores por paquete (no detienen la corrida; el paquete se omite). */
    private int errores;

    /** Último id de paquete procesado (checkpoint para reanudar). */
    private Long ultimoIdProcesado;
    /** true si se recorrieron todos los candidatos; false si se cortó por {@code maxPaquetes}. */
    private boolean completo;

    /** Muestra acotada del detalle por paquete (para revisión). */
    private List<DetalleReparacion> muestra;

    private LocalDateTime generadoEn;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DetalleReparacion {
        private Long paqueteId;
        private String resultado;
        private Long estadoAnteriorId;
        private String estadoAnteriorNombre;
        private Long estadoNuevoId;
        private String estadoNuevoNombre;
        private LocalDateTime fechaHistorica;
        private boolean eventoRegistrado;
    }
}
