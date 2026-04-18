package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request para crear un envio consolidado en una sola operacion: el operario
 * indica el codigo del envio y, opcionalmente, la lista de numeros de guia que
 * deben quedar asociados de inmediato. La asociacion se hace dentro de la
 * misma transaccion en {@code EnvioConsolidadoService.crearConGuias}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnvioConsolidadoCreateRequest {

    @NotBlank(message = "El codigo del envio es obligatorio")
    @Size(max = 100)
    private String codigo;

    @Size(max = 500, message = "Demasiadas guias en una sola operacion")
    private List<@NotBlank @Size(max = 120) String> numerosGuia;
}
