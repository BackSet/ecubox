package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Resultado del bulk de acciones sobre guías master: cuántas se
 * procesaron y cuáles fueron rechazadas, con el motivo de regla de
 * negocio que devolvió el service para cada una.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AplicarAccionGuiasMasterResponse {

    private int procesadas;
    private List<RechazoGuiaMaster> rechazados;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RechazoGuiaMaster {
        private Long guiaMasterId;
        private String trackingBase;
        private String motivo;
    }
}
