package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaqueteCreateRequest {

    @NotBlank(message = "El número de guía es obligatorio")
    private String numeroGuia;

    @NotNull(message = "El destinatario final es obligatorio")
    private Long destinatarioFinalId;

    private String contenido;
    private BigDecimal pesoLbs;
    private BigDecimal pesoKg;

    /** Guía de envío del consolidador (opcional). */
    private String numeroGuiaEnvio;
}
