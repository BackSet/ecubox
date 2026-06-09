package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AplicarEstadoEnConsolidadosRequest {

    @NotEmpty(message = "Indique al menos un consolidado")
    private List<Long> consolidadoIds;

    @NotNull(message = "Seleccione el estado a aplicar")
    private Long estadoRastreoId;
}
