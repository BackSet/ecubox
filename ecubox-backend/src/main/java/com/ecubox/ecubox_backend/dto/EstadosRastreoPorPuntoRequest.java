package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EstadosRastreoPorPuntoRequest {

    @NotNull(message = "El estado al registrar paquete es obligatorio")
    private Long estadoRastreoRegistroPaqueteId;

    @NotNull(message = "El estado en lote de recepción es obligatorio")
    private Long estadoRastreoEnLoteRecepcionId;

    @NotNull(message = "El estado en despacho es obligatorio")
    private Long estadoRastreoEnDespachoId;

    @NotNull(message = "El estado en tránsito es obligatorio")
    private Long estadoRastreoEnTransitoId;

    /** Opcional: estado que marca fin de cuenta regresiva en tracking. */
    private Long estadoRastreoFinCuentaRegresivaId;
}
