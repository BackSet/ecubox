package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Item del listado paginado de liquidaciones. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiquidacionResumenDTO {
    private Long id;
    private String codigo;
    private LocalDate fechaDocumento;
    private LocalDate periodoDesde;
    private LocalDate periodoHasta;
    private BigDecimal margenBruto;
    private BigDecimal totalCostoDistribucion;
    private BigDecimal ingresoNeto;
    private EstadoPagoConsolidado estadoPago;
    private LocalDateTime fechaPago;
    private Integer totalConsolidados;
    private Integer totalDespachos;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
