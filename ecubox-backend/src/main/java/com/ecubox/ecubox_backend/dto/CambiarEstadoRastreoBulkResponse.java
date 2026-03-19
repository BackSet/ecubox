package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CambiarEstadoRastreoBulkResponse {

    private int actualizados;
    private List<RechazoBulk> rechazados;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RechazoBulk {
        private Long paqueteId;
        private String motivo;
    }
}
