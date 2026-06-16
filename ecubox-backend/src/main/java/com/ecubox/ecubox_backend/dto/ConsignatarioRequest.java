package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsignatarioRequest {

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    @NotBlank(message = "El teléfono es obligatorio")
    private String telefono;

    @NotBlank(message = "La dirección es obligatoria")
    private String direccion;

    @NotBlank(message = "La provincia es obligatoria")
    private String provincia;

    @NotBlank(message = "El cantón es obligatorio")
    private String canton;

    private String codigo;

    /** Etiqueta organizativa opcional (texto libre, máx. 60). No sustituye al nombre. */
    @Size(max = 60, message = "La etiqueta admite máximo 60 caracteres")
    private String etiqueta;

    /**
     * Solo flujo operario/admin: usuario cliente al que pertenece el
     * consignatario. En endpoints de cliente se ignora y se usa el usuario
     * autenticado.
     */
    private Long clienteUsuarioId;
}
