package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GuiaMasterCancelarRequest {

    /**
     * Justificacion obligatoria de la cancelacion. Una guia cancelada
     * no se puede revertir sin pasar explicitamente por reabrir.
     */
    @NotBlank(message = "Debes indicar el motivo de la cancelacion")
    @Size(max = 500, message = "El motivo no puede superar los 500 caracteres")
    private String motivo;
}
