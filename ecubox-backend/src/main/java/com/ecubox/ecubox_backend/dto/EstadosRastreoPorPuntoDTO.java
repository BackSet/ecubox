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
    /** Estado aplicado cuando el operario asocia un paquete a una guía master (consolidado). */
    private Long estadoRastreoAsociarGuiaMasterId;
    private Long estadoRastreoEnDespachoId;
    /** Estado aplicado cuando el operario usa "Aplicar estado por periodo" en despachos. */
    private Long estadoRastreoEnTransitoId;
    /**
     * Estado que ANCLA el inicio de la cuenta regresiva de retiro: la cuenta empieza
     * desde la primera vez que el paquete entró a este estado. Si es null, se usa el
     * comportamiento histórico (fechaEstadoActualDesde del estado actual).
     */
    private Long estadoRastreoInicioCuentaRegresivaId;
    /** Estado que finaliza la cuenta regresiva de retiro en tracking. */
    private Long estadoRastreoFinCuentaRegresivaId;
}
