package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.entity.TipoAccesoEnlace;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Resumen que ve el titular de un enlace al abrirlo: a qué consignatarios da
 * acceso y, si es temporal, hasta cuándo.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccesoResumenDTO {
    private String etiqueta;
    private TipoAccesoEnlace tipo;
    private LocalDateTime expiraAt;
    private List<ConsignatarioResumenDTO> consignatarios;
}
