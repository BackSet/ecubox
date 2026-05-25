package com.ecubox.ecubox_backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Datos que el usuario autenticado puede actualizar de su propia cuenta.
 *
 * Reglas:
 * - {@code email} y {@code newPassword} son opcionales: solo se actualiza lo
 *   que viaje no nulo (estilo PATCH).
 * - Si se envia {@code newPassword}, debe acompanarse de {@code currentPassword}
 *   para confirmar la identidad del usuario.
 */
@Schema(description = "Actualización parcial del perfil del usuario autenticado")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MeUpdateRequest {

    @Schema(description = "Nuevo correo (opcional)", example = "nuevo@correo.com")
    @Email(message = "Correo electronico no valido")
    @Size(max = 255, message = "El correo no puede exceder 255 caracteres")
    private String email;

    @Schema(description = "Contraseña actual (requerida si se cambia la contraseña)")
    private String currentPassword;

    @Schema(description = "Nueva contraseña (opcional, mínimo 6 caracteres)")
    @Size(min = 6, max = 100, message = "La contrasena debe tener entre 6 y 100 caracteres")
    private String newPassword;
}
