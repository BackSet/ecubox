package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingResponse {

    private String numeroGuia;
    private Long estadoRastreoId;
    private String estadoRastreoNombre;
    private String consignatarioNombre;

    /** Timeline: estados activos ordenados; cada ítem indica si es el actual. */
    private List<TrackingEstadoItemDTO> estados;
    private Long estadoActualId;

    /** Fecha desde la que el paquete está en el estado actual (ISO). */
    private String fechaEstadoDesde;
    /** Leyenda del estado actual (con {dias} sustituido). */
    private String leyenda;
    private Integer diasMaxRetiro;
    private Integer diasTranscurridos;
    private Integer diasRestantes;
    private Boolean cuentaRegresivaFinalizada;
    private Boolean paqueteVencido;
    private String flujoActual;
    private Boolean bloqueado;
    private String motivoAlterno;
    private TrackingDespachoDTO despacho;
    private TrackingSacaDTO sacaActual;
    private List<TrackingPaqueteDespachoDTO> paquetesDespacho;
    private TrackingConsignatarioDTO consignatario;
    private TrackingOperadorEntregaDTO operadorEntrega;

    /**
     * Resumen ligero de la guía master a la que pertenece esta pieza, incluyendo la
     * lista de piezas hermanas para que el cliente pueda navegar al tracking
     * individual de cada una. Solo se completa cuando la guía tiene más de una
     * pieza esperada o registrada. El campo {@code timeline} dentro de este
     * resumen no se incluye en la vista de pieza para evitar respuestas pesadas
     * (el feed agregado se obtiene consultando el tracking de la guía master).
     */
    private TrackingMasterResponse master;
}
