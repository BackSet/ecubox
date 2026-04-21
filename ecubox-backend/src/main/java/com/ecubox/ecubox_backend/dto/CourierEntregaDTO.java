package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Vista del courier de entrega como catalogo logistico. No incluye
 * tarifas: los costos los calcula el modulo de Liquidaciones.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourierEntregaDTO {

    private Long id;
    private String nombre;
    private String codigo;
    private String email;
    private String horarioReparto;
    private String paginaTracking;
    private Integer diasMaxRetiroDomicilio;
}
