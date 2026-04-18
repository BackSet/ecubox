package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Body para que el operario complete metadatos de una guía existente.
 * Todos los campos son opcionales: se actualiza únicamente lo que no es null.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuiaMasterUpdateRequest {

    /**
     * Nuevo número de guía base. Si cambia, se recomponen los {@code numeroGuia}
     * de todas las piezas asociadas (formato {@code "<trackingBase> N/M"}).
     */
    private String trackingBase;

    @Min(value = 1, message = "Debe tener al menos una pieza")
    private Integer totalPiezasEsperadas;

    private Long destinatarioFinalId;
}
