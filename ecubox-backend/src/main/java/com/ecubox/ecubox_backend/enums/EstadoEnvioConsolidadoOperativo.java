package com.ecubox.ecubox_backend.enums;

/**
 * Estado operativo derivado del consolidado. No se persiste como columna:
 * se calcula desde fecha_cerrado, recepcion fisica, pago y cantidad de piezas.
 */
public enum EstadoEnvioConsolidadoOperativo {
    VACIO,
    EN_PREPARACION,
    ENVIADO_DESDE_USA,
    RECIBIDO_EN_BODEGA,
    LIQUIDADO
}
