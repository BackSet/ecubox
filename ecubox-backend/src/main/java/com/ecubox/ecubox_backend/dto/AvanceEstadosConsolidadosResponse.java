package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvanceEstadosConsolidadosResponse {
    private int consolidadosProcesados;
    private int paquetesProcesados;
    private int pasosAplicados;
    private int eventosCreados;
    private Long estadoFinalId;
    private String estadoFinalNombre;
}
