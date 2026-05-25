package com.ecubox.ecubox_backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Mensaje informativo para la dirección de casillero en EE.UU.")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MensajeAgenciaEeuuDTO {

    @Schema(description = "Texto del mensaje configurado por operario")
    private String mensaje;
}
