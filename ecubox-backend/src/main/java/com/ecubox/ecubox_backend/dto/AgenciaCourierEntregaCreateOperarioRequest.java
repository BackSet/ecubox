package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Body para crear una agencia de courierEntrega desde el flujo de despacho (operario). Sin nombre ni código. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgenciaCourierEntregaCreateOperarioRequest {

    private String provincia;
    private String canton;
    private String direccion;
    private String horarioAtencion;
    @Min(value = 0, message = "Los días máximos de retiro deben ser mayor o igual a 0")
    private Integer diasMaxRetiro;

    @NotNull(message = "La tarifa es obligatoria")
    @DecimalMin(value = "0", inclusive = true, message = "La tarifa debe ser mayor o igual a 0")
    private BigDecimal tarifa;
}
