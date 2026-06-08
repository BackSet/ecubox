package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Resumen mínimo de un consignatario para listados de enlaces de acceso. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsignatarioResumenDTO {
    private Long id;
    private String nombre;
    private String codigo;
}
