package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Detalle de un despacho en la vista de cliente: encabezado del despacho y
 * SOLO las piezas que pertenecen al cliente (o consignatario en sesión de enlace).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MiDespachoDetalleDTO {

    private Long despachoId;
    private String numeroGuia;
    private String codigoPrecinto;
    private LocalDateTime fecha;
    private String tipoEntrega;
    private String destinoNombre;
    private String observaciones;

    private int totalPiezas;
    private BigDecimal pesoLbsTotal;
    private BigDecimal pesoKgTotal;

    private boolean confirmable;
    private boolean entregaConfirmada;

    private List<MiDespachoPiezaDTO> piezas;
}
