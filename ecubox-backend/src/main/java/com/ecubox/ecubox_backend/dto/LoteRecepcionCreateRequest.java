package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoteRecepcionCreateRequest {

    private LocalDateTime fechaRecepcion;
    private String observaciones;

    @NotEmpty(message = "Debe indicar al menos una guía de envío")
    private List<String> numeroGuiasEnvio;
}
