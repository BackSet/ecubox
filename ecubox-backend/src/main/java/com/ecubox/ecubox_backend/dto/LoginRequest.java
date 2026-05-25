package com.ecubox.ecubox_backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Credenciales de inicio de sesión")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    @Schema(description = "Usuario o correo electrónico", example = "cliente@correo.com")
    @NotBlank(message = "El usuario es obligatorio")
    private String username;

    @Schema(description = "Contraseña", example = "miPassword123")
    @NotBlank(message = "La contraseña es obligatoria")
    private String password;
}
