package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingDespachoDTO {
    private Long id;
    private String numeroGuia;
    private String codigoPrecinto;
    private String tipoEntrega;
    private Integer totalSacas;
    private Integer totalPaquetes;
    private BigDecimal pesoTotalKg;
}

