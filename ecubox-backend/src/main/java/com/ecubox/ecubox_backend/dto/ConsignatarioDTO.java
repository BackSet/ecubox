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
    private Long clienteUsuarioId;
    private String clienteUsuarioNombre;
}
