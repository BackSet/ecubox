package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BuscarPaquetesPorGuiasRequest {

    /** Lista de números de guía ECUBOX (numeroGuia) a buscar. */
    @NotEmpty(message = "Debe indicar al menos una guía")
    private List<String> numeroGuias;
}
