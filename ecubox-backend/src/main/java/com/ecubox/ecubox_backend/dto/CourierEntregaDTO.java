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
public class CourierEntregaDTO {

    private Long id;
    private String nombre;
    private String codigo;
    private String email;
    private BigDecimal tarifaEnvio;
    private String horarioReparto;
    private String paginaTracking;
    private Integer diasMaxRetiroDomicilio;
}
