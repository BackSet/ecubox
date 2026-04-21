package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request de creacion/actualizacion del punto de entrega/oficina de un
 * courier como catalogo logistico. No incluye tarifas: los costos los
 * calcula el modulo de Liquidaciones.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgenciaCourierEntregaRequest {

    @NotNull(message = "El courierEntrega es obligatorio")
    private Long courierEntregaId;

    /** Opcional en create (se autogenera si no se envía). En update se ignora. */
    private String codigo;

    private String provincia;
    private String canton;
    private String direccion;
    private String horarioAtencion;

    @Min(value = 0, message = "Los días máximos de retiro deben ser mayor o igual a 0")
    private Integer diasMaxRetiro;
}
