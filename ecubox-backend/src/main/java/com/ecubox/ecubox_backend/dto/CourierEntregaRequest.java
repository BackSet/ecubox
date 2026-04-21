package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request de creacion/actualizacion del courier de entrega como catalogo
 * logistico. No incluye tarifas: los costos los calcula el modulo de
 * Liquidaciones.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourierEntregaRequest {

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    @NotBlank(message = "El código es obligatorio")
    private String codigo;

    private String email;

    private String horarioReparto;

    @Pattern(
            regexp = "^(https?://.*)?$",
            message = "La página de tracking debe iniciar con http:// o https://"
    )
    private String paginaTracking;

    @Min(value = 0, message = "Los días máximos de retiro de domicilio deben ser mayor o igual a 0")
    private Integer diasMaxRetiroDomicilio;
}
