package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Destino seleccionable del avance automático OPERATIVO de consolidados.
 * {@code codigo} es el nombre del enum {@code EstadoEnvioConsolidadoOperativo};
 * {@code nombre} es la etiqueta legible. No tiene relación con estados de rastreo.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DestinoAvanceOperativoDTO {
    private String codigo;
    private String nombre;
}
