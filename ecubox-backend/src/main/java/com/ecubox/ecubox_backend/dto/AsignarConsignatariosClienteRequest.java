package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AsignarConsignatariosClienteRequest {

    @NotNull(message = "El cliente es obligatorio")
    private Long clienteUsuarioId;

    @NotEmpty(message = "Debe indicar al menos un consignatario")
    private List<Long> consignatarioIds;
}
