package com.ecubox.ecubox_backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Schema(description = "Tarifa pública por libra para la calculadora")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TarifaCalculadoraDTO {

    @Schema(description = "Precio en USD por libra", example = "4.50")
    private BigDecimal tarifaPorLibra;
}
