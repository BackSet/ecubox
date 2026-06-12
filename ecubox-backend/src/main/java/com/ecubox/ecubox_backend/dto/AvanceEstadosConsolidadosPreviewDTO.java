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
    private EstadoPaso estadoInicial;
    private EstadoPaso estadoFinal;
    private List<Paso> pasos;
    private Resumen resumen;
    private List<Consolidado> consolidados;
    private List<String> bloqueos;
    private List<String> advertencias;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class EstadoPaso {
        private Long id;
        private String nombre;
        private Integer orden;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Paso {
        private Long estadoId;
        private String estadoNombre;
        private Integer orden;
        private LocalDateTime fecha;
        private EstadoEnvioConsolidadoOperativo efectoOperativo;
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
    }
}
