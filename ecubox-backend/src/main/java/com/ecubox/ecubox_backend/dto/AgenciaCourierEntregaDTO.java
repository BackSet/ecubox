package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Vista del punto de entrega/oficina de un courier como catalogo
 * logistico. No incluye tarifas: los costos los calcula el modulo de
 * Liquidaciones.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgenciaCourierEntregaDTO {

    private Long id;
    private Long courierEntregaId;
    private String courierEntregaNombre;
    private String codigo;
    /** Etiqueta para mostrar en listados/combos: provincia, cantón (código) o solo código */
    private String etiqueta;
    private String provincia;
    private String canton;
    private String direccion;
    private String horarioAtencion;
    private Integer diasMaxRetiro;
}
