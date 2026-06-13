package com.ecubox.ecubox_backend.enums;

import java.util.List;

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
    CANCELADO;

    /**
     * Secuencia operativa progresiva sobre la que opera el avance automático
     * (origen + destinos), en orden. Excluye estados que NO participan del
     * avance: {@code VACIO} (sin paquetes), {@code RECIBIDO_EN_BODEGA} (se
     * asigna al ingresar a un lote de recepción), {@code LIQUIDADO} y
     * {@code CANCELADO} (terminales).
     */
    public static List<EstadoEnvioConsolidadoOperativo> secuenciaAvanceOperativo() {
        return List.of(EN_PREPARACION, CERRADO, ENVIADO_DESDE_USA, ARRIBADO_ECUADOR);
    }

    /**
     * Estados destino permitidos para el avance automático, en orden progresivo.
     * No incluye {@code EN_PREPARACION} (origen, no destino) ni los excluidos.
     */
    public static List<EstadoEnvioConsolidadoOperativo> destinosAvanceOperativo() {
        return List.of(CERRADO, ENVIADO_DESDE_USA, ARRIBADO_ECUADOR);
    }

    /**
     * Posición dentro de {@link #secuenciaAvanceOperativo()}; {@code -1} si el
     * estado no participa del avance operativo.
     */
    public int ordenAvanceOperativo() {
        return secuenciaAvanceOperativo().indexOf(this);
    }

    /** {@code true} si el estado es un destino válido del avance automático. */
    public boolean esDestinoAvanceOperativo() {
        return destinosAvanceOperativo().contains(this);
    }
}
