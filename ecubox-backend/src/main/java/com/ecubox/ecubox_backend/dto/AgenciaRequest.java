package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request de creacion/actualizacion de la agencia como catalogo
 * logistico. No incluye tarifas: los costos los calcula el modulo de
 * Liquidaciones.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgenciaRequest {

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    private String encargado;

    @NotBlank(message = "El código es obligatorio")
    private String codigo;

    private String direccion;
    private String provincia;
    private String canton;
    private String horarioAtencion;

    @Min(value = 0, message = "Los días máximos de retiro deben ser mayor o igual a 0")
    private Integer diasMaxRetiro;
}
