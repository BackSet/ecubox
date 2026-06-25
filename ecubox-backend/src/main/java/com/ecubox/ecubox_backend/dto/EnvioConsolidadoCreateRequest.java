package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request para crear un envio consolidado en una sola operacion: el operario
 * indica el codigo del envio y, opcionalmente, los paquetes que deben quedar
 * asociados de inmediato. Los paquetes pueden indicarse de dos formas, que se
 * combinan y deduplican en backend:
 * <ul>
 *   <li>{@code numerosGuia}: lista pegada por el operario (carga por lista).</li>
 *   <li>{@code paqueteIds}: ids de paquetes seleccionados desde la busqueda
 *       interactiva de paquetes elegibles.</li>
 * </ul>
 * La asociacion se hace dentro de la misma transaccion en
 * {@code EnvioConsolidadoService.crearConGuias}.
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

    @Size(max = 500, message = "Demasiados paquetes en una sola operacion")
    private List<@NotNull @Positive Long> paqueteIds;
}
