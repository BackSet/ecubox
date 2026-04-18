package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Resumen de una pieza dentro de la vista de guia master para tracking publico.
 * No expone PII; el cliente puede hacer drill-down al numero de guia individual.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingPiezaItem {
    private String numeroGuia;
    private Integer piezaNumero;
    private Integer piezaTotal;
    private String estadoActualCodigo;
    private String estadoActualNombre;
    private LocalDateTime fechaEstadoDesde;
    private Boolean enFlujoAlterno;
    private Boolean bloqueado;
}
