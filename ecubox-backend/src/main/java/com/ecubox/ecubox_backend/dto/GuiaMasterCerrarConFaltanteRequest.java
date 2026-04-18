package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GuiaMasterCerrarConFaltanteRequest {

    /** Motivo del cierre con faltante. Se registra en logs para auditoría pero no se persiste en la entidad. */
    private String motivo;
}
