package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TemaTemporadaRequest {

    @NotNull(message = "El override del tema es obligatorio")
    private String override;

    /** Ventanas de activación por id de temporada. Opcional; se valida y acota en el servicio. */
    private Map<String, TemaTemporadaVentanaDTO> ventanas;
}
