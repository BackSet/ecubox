package com.ecubox.ecubox_backend.entity;

/**
 * Tipo de enlace de acceso sin registro generado para un cliente.
 *
 * <ul>
 *   <li>{@code PERSISTENTE}: sin caducidad, vive hasta que se revoca.</li>
 *   <li>{@code TEMPORAL}: caduca en la fecha indicada por {@code expira_at}.</li>
 * </ul>
 */
public enum TipoAccesoEnlace {
    PERSISTENTE,
    TEMPORAL
}
