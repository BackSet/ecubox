package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfigTarifaDistribucionDTO {

    private BigDecimal kgIncluidos;
    private BigDecimal precioFijo;
    private BigDecimal precioKgAdicional;
    private LocalDateTime updatedAt;
    private String updatedByUsername;
}
