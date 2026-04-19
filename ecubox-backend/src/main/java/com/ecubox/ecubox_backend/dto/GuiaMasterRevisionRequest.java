package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GuiaMasterRevisionRequest {

    /**
     * Razon de la revision (ej. "Datos del destinatario inconsistentes",
     * "Cliente reporto una pieza no registrada"). Opcional pero recomendado
     * para auditoria.
     */
    @Size(max = 500, message = "El motivo no puede superar los 500 caracteres")
    private String motivo;
}
