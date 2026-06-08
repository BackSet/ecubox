package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Respuesta al generar un enlace de acceso. Incluye el {@code token} en claro,
 * que solo se devuelve en este momento (no vuelve a estar disponible). El
 * frontend construye la URL del enlace a partir de el.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerarAccesoEnlaceResponse {
    private String token;
    private AccesoEnlaceDTO enlace;
}
