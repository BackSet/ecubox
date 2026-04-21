package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Detalle completo de una liquidacion (header + secciones A y B). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiquidacionDTO {
    private Long id;
    private String codigo;
    private LocalDate fechaDocumento;
    private LocalDate periodoDesde;
    private LocalDate periodoHasta;
    private String notas;
    private BigDecimal margenBruto;
    private BigDecimal totalCostoDistribucion;
    private BigDecimal ingresoNeto;
    private EstadoPagoConsolidado estadoPago;
    private LocalDateTime fechaPago;
    private String pagadoPorUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<LiquidacionConsolidadoLineaDTO> consolidados;
    private List<LiquidacionDespachoLineaDTO> despachos;
    /** Tarifa por defecto del courier de entrega (para precargar al agregar lineas B). */
    private ConfigTarifaDistribucionDTO tarifaDefault;
}
