package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.TamanioSaca;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SacaActualizarTamanioRequest {

    @NotNull(message = "El tamaño de la saca es obligatorio")
    private TamanioSaca tamanio;
}
