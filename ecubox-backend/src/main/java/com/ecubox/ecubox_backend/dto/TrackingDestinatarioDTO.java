package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Datos del destinatario expuestos en el tracking publico.
 *
 * Importante: este DTO se devuelve en endpoints sin autenticacion, por lo que
 * NO debe incluir PII sensible (telefono, direccion exacta, identificacion, etc.).
 * Solo se exponen datos minimos para que el receptor confirme que la guia es la
 * suya (nombre y, a nivel administrativo, provincia/canton).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingDestinatarioDTO {
    private Long id;
    private String nombre;
    private String provincia;
    private String canton;
}
