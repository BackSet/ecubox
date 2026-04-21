package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Linea de la seccion B (costo del courier de entrega) de una liquidacion. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiquidacionDespachoLineaDTO {
    private Long id;
    private Long despachoId;
    private String despachoNumeroGuia;
    private String despachoCourierEntregaNombre;
    private LocalDateTime despachoFechaHora;
    private BigDecimal pesoKg;
    private BigDecimal pesoLbs;
    private BigDecimal kgIncluidos;
    private BigDecimal precioFijo;
    private BigDecimal precioKgAdicional;
    private BigDecimal costoCalculado;
    private String notas;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
