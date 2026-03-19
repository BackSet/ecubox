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
public class EstadoRastreoDTO {

    private Long id;
    private String codigo;
    private String nombre;
    private Integer orden;
    private Integer ordenTracking;
    private Long afterEstadoId;
    private Boolean activo;
    private String leyenda;
    private TipoFlujoEstado tipoFlujo;
    private Boolean bloqueante;
    private Boolean publicoTracking;
}
