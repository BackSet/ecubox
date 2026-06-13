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
public class TransicionOperativaConsolidadoDTO {
    private String id;
    private String codigo;
    private String etiqueta;
    private Integer orden;
    private EstadoEnvioConsolidadoOperativo estadoPrevioRequerido;
    private EstadoEnvioConsolidadoOperativo estadoResultante;
    private EstadoPaquete estadoAplicadoPaquetes;
    private boolean disponible;
    private String tipo;
    private List<String> requisitos;
    private String permiso;
    private String problemaConfiguracion;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EstadoPaquete {
        private Long id;
        private String codigo;
        private String nombre;
        private Integer orden;
    }
}
