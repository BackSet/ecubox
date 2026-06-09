package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Pieza de un despacho en la vista de cliente. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MiDespachoPiezaDTO {

    private Long paqueteId;
    private String numeroGuia;
    private String ref;
    private String contenido;
    private BigDecimal pesoLbs;
    private BigDecimal pesoKg;
    private String estadoNombre;
    private String estadoCodigo;
    /** El cliente puede confirmar esta pieza (ya en tránsito y aún no entregada). */
    private boolean confirmable;
}
