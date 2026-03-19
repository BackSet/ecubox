package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TarifaCalculadoraRequest {

    @NotNull(message = "La tarifa por libra es obligatoria")
    @DecimalMin(value = "0", inclusive = true, message = "La tarifa debe ser mayor o igual a 0")
    private BigDecimal tarifaPorLibra;
}
