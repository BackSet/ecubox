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
    private String destinatarioNombre;

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
    private String flujoActual;
    private Boolean bloqueado;
    private String motivoAlterno;
    private TrackingDespachoDTO despacho;
    private TrackingSacaDTO sacaActual;
    private List<TrackingPaqueteDespachoDTO> paquetesDespacho;
    private TrackingDestinatarioDTO destinatario;
    private TrackingOperadorEntregaDTO operadorEntrega;
}
