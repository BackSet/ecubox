package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Vista de la agencia como catalogo logistico. No incluye tarifas: los
 * costos los calcula el modulo de Liquidaciones.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgenciaDTO {

    private Long id;
    private String nombre;
    private String encargado;
    private String codigo;
    private String direccion;
    private String provincia;
    private String canton;
    private String horarioAtencion;
    private Integer diasMaxRetiro;
}
