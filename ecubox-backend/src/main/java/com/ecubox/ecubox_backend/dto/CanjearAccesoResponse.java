package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Respuesta del canje de un enlace: JWT de solo lectura con permisos propios
 * del rol ACCESO_ENLACE y resumen de a qué da acceso.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CanjearAccesoResponse {
    private String token;
    private AccesoResumenDTO resumen;
}
