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
    private Long estadoRastreoEnviadoDesdeUsaId;
    private Long estadoRastreoArribadoEcId;
    private String estadoGuiaMasterSinPiezas;
    private String estadoGuiaMasterEnEsperaRecepcion;
    private String estadoGuiaMasterRecepcionParcial;
    private String estadoGuiaMasterRecepcionCompleta;
    private String estadoGuiaMasterDespachoParcial;
    private String estadoGuiaMasterDespachoCompletado;
    private String estadoGuiaMasterDespachoIncompleto;
    private String estadoGuiaMasterCancelada;
    private String estadoGuiaMasterEnRevision;
    private String estadoConsolidadoCreado;
    private String estadoConsolidadoAgregadoLote;
    private String estadoConsolidadoCerrado;
    private String estadoConsolidadoReabierto;
    /**
     * Estado que ANCLA el inicio de la cuenta regresiva de retiro: la cuenta empieza
     * desde la primera vez que el paquete entró a este estado. Si es null, se usa el
     * comportamiento histórico (fechaEstadoActualDesde del estado actual).
     */
    private Long estadoRastreoInicioCuentaRegresivaId;
    /** Estado que finaliza la cuenta regresiva de retiro en tracking. */
    private Long estadoRastreoFinCuentaRegresivaId;
}
