package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EstadosRastreoPorPuntoDTO {

    private Long estadoRastreoRegistroPaqueteId;
    private Long estadoRastreoEnLoteRecepcionId;
    private Long estadoRastreoEnDespachoId;
    /** Estado aplicado cuando el operario usa "Aplicar estado por periodo" en despachos. */
    private Long estadoRastreoEnTransitoId;
    /** Estado que finaliza la cuenta regresiva de retiro en tracking. */
    private Long estadoRastreoFinCuentaRegresivaId;
}
