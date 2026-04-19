package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GuiaMasterCerrarConFaltanteRequest {

    /**
     * Motivo del cierre con faltante. Se persiste en
     * {@code guia_master.motivo_cierre} y queda como evidencia auditable
     * para reclamos posteriores del cliente.
     */
    private String motivo;
}
