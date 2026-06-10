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

    @NotNull(message = "El estado al asociar a un envío consolidado es obligatorio")
    private Long estadoRastreoAsociarEnvioConsolidadoId;

    @NotNull(message = "El estado al asociar guía master es obligatorio")
    private Long estadoRastreoAsociarGuiaMasterId;

    @NotNull(message = "El estado en despacho es obligatorio")
    private Long estadoRastreoEnDespachoId;

    @NotNull(message = "El estado en tránsito es obligatorio")
    private Long estadoRastreoEnTransitoId;

    /** Opcional: estado aplicado cuando el cliente confirma la entrega de su parte del despacho. */
    private Long estadoRastreoEntregaConfirmadaClienteId;

    /** Opcional: estado que dispara el aviso (push) para que el cliente confirme la entrega. */
    private Long estadoRastreoAvisoConfirmacionEntregaId;

    /** Opcional: estado aplicado cuando el operario cierra el consolidado para registro (Manifestado). */
    private Long estadoRastreoCierreConsolidadoId;

    @NotNull(message = "El estado de salida de origen es obligatorio")
    private Long estadoRastreoEnviadoDesdeUsaId;

    /** Opcional: estado aplicado cuando el consolidado arriba a Ecuador / aduana destino. */
    private Long estadoRastreoArriboEcuadorId;

    @NotNull(message = "El estado de llegada a destino es obligatorio")
    private Long estadoRastreoArribadoEcId;

    /** Opcional: estado que ANCLA el inicio de la cuenta regresiva en tracking. */
    private Long estadoRastreoInicioCuentaRegresivaId;

    /** Opcional: estado que marca fin de cuenta regresiva en tracking. */
    private Long estadoRastreoFinCuentaRegresivaId;
}
