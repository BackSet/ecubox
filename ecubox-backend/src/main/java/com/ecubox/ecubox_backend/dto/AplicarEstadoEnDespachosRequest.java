package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Aplica un estado de rastreo a TODOS los paquetes contenidos en los despachos
 * indicados (uno o varios). Variante "puntual" del flujo "por periodo".
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AplicarEstadoEnDespachosRequest {

    @NotEmpty(message = "Indique al menos un despacho")
    private List<Long> despachoIds;

    /** Si es null, se usa el estado configurado en parámetros (Estado en tránsito). */
    private Long estadoRastreoId;
}
