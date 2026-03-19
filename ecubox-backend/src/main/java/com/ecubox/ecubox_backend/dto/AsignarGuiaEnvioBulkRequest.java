package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AsignarGuiaEnvioBulkRequest {

    /** Guía de envío a asignar a todos los paquetes (puede ser null para quitar). */
    private String numeroGuiaEnvio;

    @NotEmpty(message = "Debe indicar al menos un paquete")
    private List<Long> paqueteIds;
}
