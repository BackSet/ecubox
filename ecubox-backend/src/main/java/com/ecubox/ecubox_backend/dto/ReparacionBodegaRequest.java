package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Solicitud de la herramienta de reparación del estado de "llegada a bodega".
 * {@code DRY_RUN} audita sin escribir; {@code EXECUTE} requiere {@code confirmacion}.
 */
@Data
public class ReparacionBodegaRequest {

    public enum Modo { DRY_RUN, EXECUTE }

    @NotNull
    private Modo modo;

    /** Requerido solo en EXECUTE: debe ser la confirmación exacta documentada en el runbook. */
    private String confirmacion;

    /** Tamaño de lote. Acotado en servicio a [1, 500]. */
    @Min(1)
    @Max(500)
    private Integer batchSize;

    /** Tope opcional de paquetes a procesar en esta corrida (ejecución controlada). */
    @Min(1)
    private Integer maxPaquetes;
}
