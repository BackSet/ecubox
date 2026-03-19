package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgregarGuiasLoteRequest {

    @NotEmpty(message = "Debe indicar al menos una guía de envío")
    private List<String> numeroGuiasEnvio;
}
