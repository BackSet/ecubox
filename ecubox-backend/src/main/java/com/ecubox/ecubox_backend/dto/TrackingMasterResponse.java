package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.EstadoGuiaMaster;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Respuesta del endpoint publico de tracking cuando el codigo coincide con
 * el {@code tracking_base} de una guia master. Provee resumen agregado y
 * la lista de piezas para drill-down.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingMasterResponse {
    private String trackingBase;
    private EstadoGuiaMaster estadoGlobal;
    private Integer totalPiezasEsperadas;
    private Integer piezasRegistradas;
    private Integer piezasRecibidas;
    private Integer piezasDespachadas;
    /** @deprecated Mantener por compatibilidad. Usar {@link #consignatario}. */
    @Deprecated
    private String consignatarioNombre;
    /**
     * Datos públicos del consignatario asociado a la guía master (sin PII sensible).
     * Permite mostrar nombre y provincia/cantón en el tracking de la guía consolidada,
     * con la misma estructura que la vista de pieza.
     */
    private TrackingConsignatarioDTO consignatario;
    private List<TrackingPiezaItem> piezas;
    private LocalDateTime fechaPrimeraRecepcion;
    private LocalDateTime fechaPrimeraPiezaDespachada;
    private LocalDateTime ultimaActualizacion;
    /** Feed agregado de eventos (poblado en Sprint 2). */
    private List<TrackingMasterEventoItem> timeline;
}
