package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Body para que el cliente final actualice los metadatos editables de una de
 * sus guías. {@code trackingBase} es opcional (solo se aplica si se envía).
 * La edición solo se permite mientras la guía esté en estado
 * {@code INCOMPLETA} (sin piezas recibidas).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MiGuiaUpdateRequest {

    /** Nuevo número de guía base (opcional). */
    private String trackingBase;

    @NotNull(message = "Selecciona un destinatario")
    private Long destinatarioFinalId;
}
