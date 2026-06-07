package com.ecubox.ecubox_backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Ventana de activación de una temporada (días alrededor de la fecha clave)")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemaTemporadaVentanaDTO {

    @Schema(description = "Días de anticipación con que se activa el tema antes del día festivo", example = "14")
    private Integer diasAntes;

    @Schema(description = "Días que el tema permanece activo después del día festivo", example = "0")
    private Integer diasDespues;
}
