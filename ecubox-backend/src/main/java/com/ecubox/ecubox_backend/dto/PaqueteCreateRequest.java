package com.ecubox.ecubox_backend.dto;

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

    @NotNull(message = "El destinatario final es obligatorio")
    private Long destinatarioFinalId;

    private String contenido;
    private BigDecimal pesoLbs;
    private BigDecimal pesoKg;

    /**
     * Guía master del consolidador a la que pertenece la pieza.
     * Si se omite, el backend creará una guía master individual (1/1) automáticamente.
     */
    private Long guiaMasterId;

    /** Número de pieza dentro de la guía master (1..total). Si se omite, se toma el siguiente disponible. */
    private Integer piezaNumero;
}
