package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Resultado de la busqueda de paquetes para agregarlos a un envio consolidado.
 *
 * <p>Envuelve el {@link PaqueteDTO} con la elegibilidad para la asociacion a un
 * consolidado, calculada con la misma regla que aplica
 * {@code EnvioConsolidadoService.agregarPaquetes} (el paquete debe estar
 * exactamente en el estado de rastreo inmediatamente anterior al de "asociar a
 * envio consolidado", no estar en revision y no pertenecer a un consolidado ya
 * cerrado). De este modo la UI puede mostrar el motivo cuando un paquete no es
 * seleccionable sin tener que reimplementar la regla.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaqueteElegibleConsolidadoDTO {

    /** Datos del paquete (incluye guia, destinatario, peso, estado y consolidado actual). */
    private PaqueteDTO paquete;

    /** true si el paquete puede asociarse al consolidado en su estado actual. */
    private boolean elegible;

    /** Motivo legible cuando {@code elegible == false}; {@code null} si es elegible. */
    private String motivoNoElegible;
}
