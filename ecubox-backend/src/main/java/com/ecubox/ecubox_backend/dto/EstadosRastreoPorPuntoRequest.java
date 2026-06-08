package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
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

    @NotNull(message = "El estado al asociar guía master es obligatorio")
    private Long estadoRastreoAsociarGuiaMasterId;

    @NotNull(message = "El estado en despacho es obligatorio")
    private Long estadoRastreoEnDespachoId;

    @NotNull(message = "El estado en tránsito es obligatorio")
    private Long estadoRastreoEnTransitoId;

    @NotNull(message = "El estado de salida de origen es obligatorio")
    private Long estadoRastreoEnviadoDesdeUsaId;

    @NotNull(message = "El estado de llegada a destino es obligatorio")
    private Long estadoRastreoArribadoEcId;

    @NotBlank(message = "El estado de guía master sin piezas es obligatorio")
    private String estadoGuiaMasterSinPiezas;

    @NotBlank(message = "El estado de guía master en espera de recepción es obligatorio")
    private String estadoGuiaMasterEnEsperaRecepcion;

    @NotBlank(message = "El estado de guía master con recepción parcial es obligatorio")
    private String estadoGuiaMasterRecepcionParcial;

    @NotBlank(message = "El estado de guía master con recepción completa es obligatorio")
    private String estadoGuiaMasterRecepcionCompleta;

    @NotBlank(message = "El estado de guía master con despacho parcial es obligatorio")
    private String estadoGuiaMasterDespachoParcial;

    @NotBlank(message = "El estado de guía master con despacho completado es obligatorio")
    private String estadoGuiaMasterDespachoCompletado;

    @NotBlank(message = "El estado de guía master con despacho incompleto es obligatorio")
    private String estadoGuiaMasterDespachoIncompleto;

    @NotBlank(message = "El estado de guía master cancelada es obligatorio")
    private String estadoGuiaMasterCancelada;

    @NotBlank(message = "El estado de guía master en revisión es obligatorio")
    private String estadoGuiaMasterEnRevision;

    @NotBlank(message = "El estado de consolidado creado es obligatorio")
    private String estadoConsolidadoCreado;

    @NotBlank(message = "El estado de consolidado agregado a lote es obligatorio")
    private String estadoConsolidadoAgregadoLote;

    @NotBlank(message = "El estado de consolidado cerrado es obligatorio")
    private String estadoConsolidadoCerrado;

    @NotBlank(message = "El estado de consolidado reabierto es obligatorio")
    private String estadoConsolidadoReabierto;

    /** Opcional: estado que ANCLA el inicio de la cuenta regresiva en tracking. */
    private Long estadoRastreoInicioCuentaRegresivaId;

    /** Opcional: estado que marca fin de cuenta regresiva en tracking. */
    private Long estadoRastreoFinCuentaRegresivaId;
}
