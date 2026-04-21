package com.ecubox.ecubox_backend.enums;

/**
 * Estado de pago de la liquidación de un envío consolidado.
 *
 * <p>Es independiente del estado logístico (abierto/cerrado) del envío: un
 * consolidado puede estar abierto y ya pagado, o cerrado y no pagado.
 */
public enum EstadoPagoConsolidado {
    NO_PAGADO,
    PAGADO
}
