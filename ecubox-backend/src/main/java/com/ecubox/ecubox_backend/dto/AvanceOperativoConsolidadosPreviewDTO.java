package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Vista previa del avance automático OPERATIVO: muestra los pasos operativos
 * intermedios que se aplicarán a cada consolidado para alcanzar el destino,
 * sin modificar datos. No contiene estados de rastreo de paquetes.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvanceOperativoConsolidadosPreviewDTO {

    private String previewToken;

    /** Estado operativo destino del avance. */
    private Paso estadoDestino;

    /**
     * Pasos operativos intermedios a aplicar (unión ordenada de los pasos de
     * cada consolidado). Para una selección homogénea coincide con el camino.
     */
    private List<Paso> pasos;

    private List<Consolidado> consolidados;

    private Resumen resumen;

    private List<String> advertencias;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Paso {
        private String codigo;
        private String nombre;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Consolidado {
        private Long id;
        private String codigo;
        private EstadoEnvioConsolidadoOperativo estadoOperativoActual;
        private EstadoEnvioConsolidadoOperativo estadoOperativoFinal;
        private List<Paso> pasos;
        private Long version;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Resumen {
        private int totalConsolidados;
        private int totalPasos;
    }
}
