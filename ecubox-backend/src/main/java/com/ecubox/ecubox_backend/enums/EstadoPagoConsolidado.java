package com.ecubox.ecubox_backend.enums;

/**
 * Estado de pago de la liquidación de un envío consolidado.
 *
 * <p>Es independiente del estado logistico del envio: un consolidado puede
 * estar en preparacion y ya pagado, o enviado desde USA y no pagado.
 */
public enum EstadoPagoConsolidado {
    NO_PAGADO,
    PAGADO
}
