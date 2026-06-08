package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Canje del token de un enlace por una sesión JWT de solo lectura.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CanjearAccesoRequest {

    @NotBlank(message = "El token es obligatorio")
    private String token;
}
