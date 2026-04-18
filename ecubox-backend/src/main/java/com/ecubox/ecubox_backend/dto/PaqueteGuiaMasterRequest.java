package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Asocia un paquete (pieza) a una guía master existente.
 * Si {@code guiaMasterId} viene null, el paquete queda sin guía master (no soportado; usar AUTO).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaqueteGuiaMasterRequest {

    /** Guía master a la que pertenece la pieza. */
    private Long guiaMasterId;

    /** Número de pieza dentro de la guía master (opcional; si es null, se asigna el siguiente). */
    private Integer piezaNumero;
}
