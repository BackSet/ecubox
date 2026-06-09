package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Resultado de aplicar una transición operativa a consolidados. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AplicarTransicionConsolidadosResponse {

    private int consolidadosProcesados;
    private List<RechazoConsolidado> rechazados;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RechazoConsolidado {
        private Long consolidadoId;
        private String codigo;
        private String motivo;
    }
}
