package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request del bulk de acciones de ciclo de vida sobre guías master.
 * Acciones soportadas: APROBAR, RECALCULAR, MARCAR_REVISION,
 * SALIR_REVISION, CANCELAR y REABRIR. El motivo es obligatorio solo
 * para CANCELAR/REABRIR (validado en el service, igual que en los
 * endpoints individuales).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AplicarAccionGuiasMasterRequest {

    @NotBlank(message = "La acción es obligatoria")
    private String accion;

    @NotEmpty(message = "Debes indicar al menos una guía master")
    private List<Long> guiaIds;

    private String motivo;
}
