package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Item del feed agregado de eventos de todas las piezas de una guia master.
 * Permite mostrar "pieza N/M paso a estado X el ..." en orden cronologico.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingMasterEventoItem {
    private String numeroGuia;
    private Integer piezaNumero;
    private Integer piezaTotal;
    private String estadoCodigo;
    private String estadoNombre;
    private String eventoTipo;
    private LocalDateTime occurredAt;
}
