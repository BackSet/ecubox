package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Aplica una transición de estado OPERATIVO a consolidados, por selección de ids
 * o por periodo (fecha de creación). Solo se admiten los destinos con acción real:
 * {@code ENVIADO_DESDE_USA} y {@code EN_PREPARACION}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AplicarTransicionConsolidadosRequest {

    @NotBlank(message = "El estado operativo destino es obligatorio")
    private String estadoOperativoDestino;

    /** Modo por selección: ids de consolidados. */
    private List<Long> consolidadoIds;

    /** Modo por periodo: rango de fecha de creación (inclusive). */
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
}
