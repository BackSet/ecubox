package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvanceEstadosConsolidadosResponse {
    private int consolidadosProcesados;
    private int paquetesProcesados;
    private int transicionesAplicadas;
    private int eventosCreados;
    private String transicionFinalCodigo;
    private List<ConsolidadoResultado> consolidados;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConsolidadoResultado {
        private Long id;
        private String codigo;
        private EstadoEnvioConsolidadoOperativo estadoFinal;
    }
}
