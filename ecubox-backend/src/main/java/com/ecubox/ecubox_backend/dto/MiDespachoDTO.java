package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Vista de cliente: un despacho con SOLO las piezas que pertenecen al cliente
 * (o al consignatario en sesión de enlace), para que pueda confirmar su entrega.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MiDespachoDTO {

    private Long despachoId;
    private LocalDateTime fecha;
    private String tipoEntrega;
    /** Cantidad de piezas del cliente en este despacho. */
    private int totalPiezas;
    /** Hay al menos una pieza que el cliente puede confirmar ahora. */
    private boolean confirmable;
    /** Todas las piezas del cliente ya están en (o después de) el estado de entrega confirmada. */
    private boolean entregaConfirmada;
    private List<MiDespachoPiezaDTO> piezas;
}
