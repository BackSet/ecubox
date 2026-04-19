package com.ecubox.ecubox_backend.dto;

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
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MeUpdateRequest {

    @Email(message = "Correo electronico no valido")
    @Size(max = 255, message = "El correo no puede exceder 255 caracteres")
    private String email;

    private String currentPassword;

    @Size(min = 6, max = 100, message = "La contrasena debe tener entre 6 y 100 caracteres")
    private String newPassword;
}
