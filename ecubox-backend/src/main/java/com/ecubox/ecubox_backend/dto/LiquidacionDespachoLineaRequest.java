package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Agrega o actualiza una linea de la seccion B. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiquidacionDespachoLineaRequest {

    /** Solo se usa al agregar (POST). En el PUT se ignora. */
    @NotNull(message = "El despacho es obligatorio")
    private Long despachoId;

    @NotNull(message = "El peso (kg) es obligatorio")
    @DecimalMin(value = "0.0", message = "El peso no puede ser negativo")
    private BigDecimal pesoKg;

    @NotNull(message = "Los kg incluidos son obligatorios")
    @DecimalMin(value = "0.0", message = "Los kg incluidos no pueden ser negativos")
    private BigDecimal kgIncluidos;

    @NotNull(message = "El precio fijo es obligatorio")
    @DecimalMin(value = "0.0", message = "El precio fijo no puede ser negativo")
    private BigDecimal precioFijo;

    @NotNull(message = "El precio por kg adicional es obligatorio")
    @DecimalMin(value = "0.0", message = "El precio por kg adicional no puede ser negativo")
    private BigDecimal precioKgAdicional;

    @Size(max = 4000, message = "Las notas no pueden superar 4000 caracteres")
    private String notas;
}
