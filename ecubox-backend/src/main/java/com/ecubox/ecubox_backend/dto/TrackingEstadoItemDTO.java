package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
}
