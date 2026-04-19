package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GuiaMasterReabrirRequest {

    /**
     * Justificacion obligatoria de la reapertura. Reabrir una guia
     * terminal (DESPACHO_COMPLETADO, DESPACHO_INCOMPLETO o CANCELADA)
     * vuelve al estado derivado por sus piezas y limpia la auditoria
     * de cierre, por lo que conviene dejar evidencia explicita.
     */
    @NotBlank(message = "Debes indicar el motivo de la reapertura")
    @Size(max = 500, message = "El motivo no puede superar los 500 caracteres")
    private String motivo;
}
