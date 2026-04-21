package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Linea de la seccion A (costo al proveedor) de una liquidacion. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiquidacionConsolidadoLineaDTO {
    private Long id;
    private Long envioConsolidadoId;
    private String envioConsolidadoCodigo;
    private Boolean envioConsolidadoCerrado;
    private Integer envioConsolidadoTotalPaquetes;
    private BigDecimal envioConsolidadoPesoTotalLbs;
    private BigDecimal costoProveedor;
    private BigDecimal ingresoCliente;
    private BigDecimal margenLinea;
    private String notas;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
