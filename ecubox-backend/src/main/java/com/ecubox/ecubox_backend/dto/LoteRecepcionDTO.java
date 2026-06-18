package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoteRecepcionDTO {

    private Long id;
    private LocalDateTime fechaRecepcion;
    private String observaciones;
    private Long operarioId;
    private String operarioNombre;
    private List<String> numeroGuiasEnvio;
    private List<PaqueteDTO> paquetes;
    private Integer totalPaquetes;

    /**
     * Resumen de la aplicación del estado de "llegada a bodega" durante esta
     * operación de recepción (create/agregar guías). Solo se completa en la
     * respuesta de esas mutaciones; es {@code null} en lecturas.
     */
    private RecepcionEstadoResumenDTO resumenRecepcion;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RecepcionEstadoResumenDTO {
        /** Paquetes considerados en la operación. */
        private int total;
        /** Paquetes que avanzaron al estado de bodega. */
        private int avanzados;
        /** Paquetes omitidos por estar ya en el estado del hito. */
        private int sinCambioMismoEstado;
        /** Paquetes omitidos por estar en un estado posterior o terminal (no se degradan). */
        private int omitidosPosteriores;
        /** Paquetes omitidos por estar en flujo alterno. */
        private int omitidosAlternos;
        /** Paquetes omitidos por estar bloqueados. */
        private int omitidosBloqueados;
    }
}
