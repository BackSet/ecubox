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
public class PaqueteUpdateRequest {

    @NotNull(message = "El destinatario final es obligatorio")
    private Long consignatarioId;

    private String contenido;
    private BigDecimal pesoLbs;
    private BigDecimal pesoKg;

    /** Guía master del consolidador (opcional). */
    private Long guiaMasterId;

    /** Número de pieza dentro de la guía master (opcional). */
    private Integer piezaNumero;

    /** Referencia interna única (opcional; solo admin/operario). */
    private String ref;
}
