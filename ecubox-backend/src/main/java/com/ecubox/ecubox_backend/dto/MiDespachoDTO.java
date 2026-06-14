package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
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
    /** Número de guía de la entrega (del despacho), para que el cliente la reconozca sin abrir el detalle. */
    private String numeroGuia;
    private LocalDateTime fecha;
    private String tipoEntrega;
    /** Destino de ESTA entrega resuelto por modalidad (destinatario / oficina / punto de entrega), con snapshot SCD2. */
    private String destinoNombre;
    /** Operador u oficina que entrega: courier de entrega o agencia ECUBOX según la modalidad. */
    private String operadorEntregaNombre;
    /** Cantidad de piezas del cliente en este despacho. */
    private int totalPiezas;
    /** Peso total (lbs) de SOLO las piezas del cliente en este despacho. */
    private BigDecimal pesoLbsTotal;
    /** Peso total (kg) de SOLO las piezas del cliente en este despacho. */
    private BigDecimal pesoKgTotal;
    /** Hay al menos una pieza que el cliente puede confirmar ahora. */
    private boolean confirmable;
    /** Todas las piezas del cliente ya están en (o después de) el estado de entrega confirmada. */
    private boolean entregaConfirmada;
    private List<MiDespachoPiezaDTO> piezas;
}
