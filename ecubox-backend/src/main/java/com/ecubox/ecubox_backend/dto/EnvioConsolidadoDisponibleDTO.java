package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Item del selector de envios consolidados disponibles para liquidar (seccion A). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnvioConsolidadoDisponibleDTO {
    private Long id;
    private String codigo;
    private boolean cerrado;
    private LocalDateTime fechaCerrado;
    private Integer totalPaquetes;
    private BigDecimal pesoTotalLbs;
    private LocalDateTime createdAt;
}
