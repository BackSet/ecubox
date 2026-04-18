package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingEstadoItemDTO {

    private Long id;
    private String codigo;
    private String nombre;
    private Integer orden;
    private TipoFlujoEstado tipoFlujo;
    /** Leyenda con {dias} ya reemplazado por el valor numérico, o null. */
    private String leyenda;
    private boolean esActual;
    /**
     * Timestamp real de cuando ocurrio la transicion a este estado, tomado del
     * event log {@code paquete_estado_evento}. Null si el paso aun no ha ocurrido
     * (placeholder para pasos futuros del catalogo).
     */
    private LocalDateTime fechaOcurrencia;
}
