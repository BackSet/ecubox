package com.ecubox.ecubox_backend.enums;

/**
 * Discriminador del DTO {@link com.ecubox.ecubox_backend.dto.TrackingResolveResponse}.
 * Identifica la naturaleza del codigo consultado y por tanto la forma del payload.
 *
 * <p>Nota: el envio consolidado es interno del operario y no se expone en el
 * tracking publico, por lo que solo existen dos tipos resolubles aqui.
 */
public enum TrackingTipo {
    /** Pieza individual: el codigo coincide con paquete.numero_guia. */
    PIEZA,
    /** Guia del consolidador (master): el codigo coincide con guia_master.tracking_base. */
    GUIA_MASTER
}
