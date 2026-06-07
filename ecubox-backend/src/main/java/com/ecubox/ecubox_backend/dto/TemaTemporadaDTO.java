package com.ecubox.ecubox_backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Schema(description = "Tema de temporada (días festivos) del sitio público")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemaTemporadaDTO {

    @Schema(description = "Override del tema: 'auto', 'off' o el id de una temporada",
            example = "auto")
    private String override;

    @Schema(description = "Ventanas de activación configuradas por id de temporada")
    private Map<String, TemaTemporadaVentanaDTO> ventanas;
}
