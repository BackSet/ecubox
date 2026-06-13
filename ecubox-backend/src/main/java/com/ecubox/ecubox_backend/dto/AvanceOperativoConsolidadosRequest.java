package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Petición del avance automático OPERATIVO de consolidados: avanza por estados
 * de {@code EstadoEnvioConsolidadoOperativo} hasta un destino, aplicando los
 * pasos operativos intermedios. No usa estados de rastreo de paquetes.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvanceOperativoConsolidadosRequest {

    @NotEmpty(message = "Indique al menos un consolidado")
    private List<Long> consolidadoIds;

    /** Código del estado operativo destino: CERRADO, ENVIADO_DESDE_USA o ARRIBADO_ECUADOR. */
    @NotBlank(message = "Seleccione el estado operativo destino")
    private String estadoOperativoDestino;

    /** Obligatorio al aplicar; se obtiene desde el preview. */
    private String previewToken;
}
