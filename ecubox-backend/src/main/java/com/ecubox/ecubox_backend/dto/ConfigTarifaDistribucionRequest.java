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
public class ConfigTarifaDistribucionRequest {

    @NotNull(message = "Los kg incluidos son obligatorios")
    @DecimalMin(value = "0", inclusive = true, message = "Los kg incluidos deben ser mayores o iguales a 0")
    private BigDecimal kgIncluidos;

    @NotNull(message = "El precio fijo es obligatorio")
    @DecimalMin(value = "0", inclusive = true, message = "El precio fijo debe ser mayor o igual a 0")
    private BigDecimal precioFijo;

    @NotNull(message = "El precio por kg adicional es obligatorio")
    @DecimalMin(value = "0", inclusive = true, message = "El precio por kg adicional debe ser mayor o igual a 0")
    private BigDecimal precioKgAdicional;
}
