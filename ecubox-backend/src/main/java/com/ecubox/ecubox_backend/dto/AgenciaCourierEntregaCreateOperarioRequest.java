package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Body para crear un punto de entrega de un courier desde el flujo de
 * despacho (operario). Sin nombre, sin codigo y sin tarifa: el costo
 * lo maneja el modulo de Liquidaciones.
 */
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
}
