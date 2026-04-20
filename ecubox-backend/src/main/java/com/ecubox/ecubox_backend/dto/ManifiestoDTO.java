package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.EstadoManifiesto;
import com.ecubox.ecubox_backend.enums.FiltroManifiesto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManifiestoDTO {

    private Long id;
    private String codigo;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
    private FiltroManifiesto filtroTipo;
    private Long filtroCourierEntregaId;
    private String filtroCourierEntregaNombre;
    private Long filtroAgenciaId;
    private String filtroAgenciaNombre;
    private Integer cantidadDespachos;
    private BigDecimal subtotalDomicilio;
    private BigDecimal subtotalAgenciaFlete;
    private BigDecimal subtotalComisionAgencias;
    private BigDecimal totalCourierEntrega;
    private BigDecimal totalAgencia;
    private BigDecimal totalPagar;
    private EstadoManifiesto estado;

    /** Lista de despachos del manifiesto (poblada solo en detalle). */
    @Builder.Default
    private List<DespachoEnManifiestoDTO> despachos = List.of();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DespachoEnManifiestoDTO {
        private Long id;
        private String numeroGuia;
        private String courierEntregaNombre;
        private String tipoEntrega;
        private String agenciaNombre;
        private String consignatarioNombre;
    }
}
