package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MiGuiaCreateRequest {

    @NotBlank(message = "El número de guía es obligatorio")
    private String trackingBase;

    @NotNull(message = "Selecciona un destinatario")
    private Long consignatarioId;
}
