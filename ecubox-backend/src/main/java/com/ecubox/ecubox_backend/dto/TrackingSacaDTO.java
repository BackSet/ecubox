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
public class TrackingSacaDTO {
    private Long id;
    private String numeroOrden;
    private String tamanio;
    private BigDecimal pesoKg;
    private BigDecimal pesoLbs;
}

