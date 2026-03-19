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
public class AgenciaDistribuidorDTO {

    private Long id;
    private Long distribuidorId;
    private String distribuidorNombre;
    private String codigo;
    /** Etiqueta para mostrar en listados/combos: provincia, cantón (código) o solo código */
    private String etiqueta;
    private String provincia;
    private String canton;
    private String direccion;
    private String horarioAtencion;
    private Integer diasMaxRetiro;
    private BigDecimal tarifa;
}
