package com.ecubox.ecubox_backend.enums;

public enum TrackingEventType {
    PAQUETE_REGISTRADO,
    ESTADO_CAMBIO_MANUAL,
    ESTADO_CAMBIO_BULK,
    ESTADO_APLICADO_DESPACHO,
    ESTADO_APLICADO_LOTE_RECEPCION,
    ESTADO_APLICADO_PERIODO,
    ESTADO_APLICADO_ASOCIAR_ENVIO_CONSOLIDADO,
    ESTADO_APLICADO_ASOCIAR_GUIA_MASTER,
    ESTADO_APLICADO_ENVIADO_USA,
    ESTADO_APLICADO_ARRIBADO_EC,
    ESTADO_APLICADO_CIERRE_CONSOLIDADO,
    ESTADO_APLICADO_ARRIBO_ECUADOR,
    ESTADO_CONFIRMADO_CLIENTE,
    /**
     * Reparación histórica del estado de "llegada a bodega" para paquetes cuyo
     * consolidado fue recibido en un lote pero que no recibieron el estado
     * configurado (corrección de inconsistencias previas al MVP 2). Es un evento
     * de auditoría que NO genera outbox ni notificaciones.
     */
    ESTADO_REPARADO_LOTE_RECEPCION
}
