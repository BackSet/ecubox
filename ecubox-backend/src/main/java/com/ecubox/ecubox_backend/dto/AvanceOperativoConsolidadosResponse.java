package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Resultado de aplicar el avance automático OPERATIVO a un conjunto de
 * consolidados. {@code estadoFinal} es el código del estado operativo destino.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvanceOperativoConsolidadosResponse {
    private int consolidadosProcesados;
    private int pasosAplicados;
    private String estadoFinal;
    private String estadoFinalNombre;
}
