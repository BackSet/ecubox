package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.EstadoManifiesto;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CambiarEstadoManifiestoRequest {

    @NotNull(message = "El estado es obligatorio")
    private EstadoManifiesto estado;
}
