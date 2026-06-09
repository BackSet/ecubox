package com.ecubox.ecubox_backend.enums;

/**
 * Estado operativo del envío consolidado. Se persiste en {@code envio_consolidado.estado_operativo}.
 *
 * <p>Flujo: VACIO → EN_PREPARACION → CERRADO → ENVIADO_DESDE_USA
 * → ARRIBADO_ECUADOR → RECIBIDO_EN_BODEGA → LIQUIDADO.
 * CANCELADO puede alcanzarse desde cualquier estado no liquidado.
 */
public enum EstadoEnvioConsolidadoOperativo {
    /** Sin paquetes asociados. */
    VACIO,
    /** Paquetes agregados; admite cambios. */
    EN_PREPARACION,
    /** Registro cerrado; no admite más paquetes. Pendiente de envío. */
    CERRADO,
    /** Salida desde USA registrada. */
    ENVIADO_DESDE_USA,
    /** Llegada a aduana destino (Ecuador) registrada. */
    ARRIBADO_ECUADOR,
    /** Registrado en lote de recepción en bodega Ecuador. */
    RECIBIDO_EN_BODEGA,
    /** Cierre administrativo/liquidación pagada. Estado terminal. */
    LIQUIDADO,
    /** Anulado. Estado terminal. */
    CANCELADO
}
