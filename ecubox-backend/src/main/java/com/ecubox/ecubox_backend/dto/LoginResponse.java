package com.ecubox.ecubox_backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "Respuesta de autenticación con JWT y permisos del usuario")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponse {

    @Schema(description = "Token JWT (null en GET /me)", example = "eyJhbGciOiJIUzI1NiIs...")
    private String token;
    @Schema(description = "Nombre de usuario", example = "cliente1")
    private String username;
    @Schema(description = "Correo electrónico", example = "cliente@correo.com")
    private String email;
    @Schema(description = "Fecha de creación de la cuenta")
    private LocalDateTime createdAt;
    @Schema(description = "Roles asignados", example = "[\"CLIENTE\"]")
    private List<String> roles;
    @Schema(description = "Códigos de permisos efectivos")
    private List<String> permissions;
}
