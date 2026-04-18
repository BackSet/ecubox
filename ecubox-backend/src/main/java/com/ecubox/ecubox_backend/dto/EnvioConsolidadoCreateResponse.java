package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Respuesta del POST /api/envios-consolidados. Incluye el envio recien creado
 * (con sus paquetes ya asociados) y la lista de numeros de guia que el
 * operario envio pero no se encontraron en el sistema, para mostrar feedback
 * al usuario sin abortar la creacion.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnvioConsolidadoCreateResponse {

    private EnvioConsolidadoDTO envio;

    /** Numeros de guia ingresados que no existen como paquete; nunca null. */
    private List<String> guiasNoEncontradas;
}
