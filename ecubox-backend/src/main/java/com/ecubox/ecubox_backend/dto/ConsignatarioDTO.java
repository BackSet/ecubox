package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsignatarioDTO {

    private Long id;
    private String nombre;
    private String telefono;
    private String direccion;
    private String provincia;
    private String canton;
    private String codigo;
    /** Etiqueta organizativa opcional (texto libre, máx. 60). */
    private String etiqueta;
    private Long clienteUsuarioId;
    private String clienteUsuarioNombre;

    /**
     * Conteos de envíos asociados a este destinatario, resueltos por proyección
     * de base de datos (sin descargar los datasets). Solo se rellenan en las
     * vistas de listado del cliente/enlace ("Mis destinatarios"); en otras
     * vistas pueden venir {@code null}.
     */
    private Long totalGuias;
    private Long totalPaquetes;
}
