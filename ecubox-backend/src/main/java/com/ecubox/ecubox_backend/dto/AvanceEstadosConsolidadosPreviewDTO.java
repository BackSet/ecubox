package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvanceEstadosConsolidadosPreviewDTO {
    private String previewToken;
    private TransicionOperativaConsolidadoDTO transicionInicial;
    private TransicionOperativaConsolidadoDTO transicionFinal;
    private List<Paso> pasos;
    private Resumen resumen;
    private List<Consolidado> consolidados;
    private List<String> bloqueos;
    private List<String> advertencias;
    private boolean valida;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Paso {
        private String transicionCodigo;
        private String transicionEtiqueta;
        private Integer orden;
        private LocalDateTime fecha;
        private EstadoEnvioConsolidadoOperativo estadoResultante;
        private TransicionOperativaConsolidadoDTO.EstadoPaquete estadoAplicadoPaquetes;
        private String tipo;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Resumen {
        private int totalConsolidados;
        private int totalPaquetes;
        private int totalPasos;
        private int totalEventosPrevistos;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Consolidado {
        private Long id;
        private String codigo;
        private int totalPaquetes;
        private EstadoEnvioConsolidadoOperativo estadoOperativoActual;
        private EstadoEnvioConsolidadoOperativo estadoOperativoFinal;
        private Long version;
        private List<String> bloqueos;
    }
}
