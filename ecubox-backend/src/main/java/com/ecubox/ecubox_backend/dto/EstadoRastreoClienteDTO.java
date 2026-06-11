package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Vista del catálogo de estados de rastreo para el cliente final
 * (leyenda "qué significa cada estado" en mis-guias). Es un subconjunto
 * deliberado de {@link EstadoRastreoDTO}: no expone campos de
 * administración como {@code codigo}, {@code activo}, {@code afterEstadoId}
 * o {@code publicoTracking}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EstadoRastreoClienteDTO {

    private Long id;
    private String nombre;
    /** Texto configurable que explica el estado; puede contener el placeholder {dias}. */
    private String leyenda;
    private Integer ordenTracking;
    private TipoFlujoEstado tipoFlujo;
}
