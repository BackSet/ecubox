package com.ecubox.ecubox_backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Resumen liviano del listado de paquetes. Sustituye la descarga del dataset
 * completo en el cliente: agrega los KPIs del universo, los conteos por chip
 * (respetando los filtros estructurales activos) y las opciones distintas de
 * los comboboxes de filtro. La tabla se sigue sirviendo paginada desde
 * {@code GET /paquetes/page}.
 */
@Data
@Builder
public class PaqueteResumenDTO {

    /** KPIs sobre el universo visible (no afectados por los filtros activos). */
    private long total;
    private long conPeso;
    private long vencidos;
    private long consignatariosDistintos;

    /** Conteos por chip respetando los filtros estructurales (q/estado/consignatario/envío/guía master). */
    private ChipCounts chips;

    /**
     * Conteos por BANDEJA sobre el universo visible (ownership), independientes
     * de la bandeja activa y de los filtros secundarios. Alimentan los
     * contadores de las pestañas de bandeja. {@code operativos = todos - enRevision}.
     */
    private BandejaCounts bandejas;

    /** Opciones distintas para poblar los comboboxes de filtro. */
    private long sinPeso;
    private List<EstadoOption> estados;
    private List<ConsignatarioOption> consignatarios;
    private List<String> codigosEnvio;
    private List<GuiaMasterOption> guiasMaster;

    @Data
    @Builder
    public static class ChipCounts {
        private long todos;
        private long sinPeso;
        private long conPeso;
        private long sinGuiaMaster;
        private long vencidos;
    }

    @Data
    @Builder
    public static class BandejaCounts {
        private long todos;
        private long operativos;
        private long enRevision;
    }

    @Data
    @Builder
    public static class EstadoOption {
        private String codigo;
        private String nombre;
    }

    @Data
    @Builder
    public static class ConsignatarioOption {
        private Long id;
        private String nombre;
    }

    @Data
    @Builder
    public static class GuiaMasterOption {
        private Long id;
        private String trackingBase;
    }
}
