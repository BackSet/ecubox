package com.ecubox.ecubox_backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Registro simplificado de cliente")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClienteRegisterSimpleRequest {

    @Schema(description = "Correo electrónico", example = "nuevo@correo.com")
    @NotBlank(message = "El correo electrónico es obligatorio")
    @Email(message = "Correo electrónico no válido")
    @Size(max = 255)
    private String email;

    @Schema(description = "Contraseña (mínimo 6 caracteres)", example = "miPassword123")
    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 6, message = "La contraseña debe tener al menos 6 caracteres")
    private String password;
}
