package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.EstadoRevisionPaquete;
import com.ecubox.ecubox_backend.enums.MotivoRevisionPaquete;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RevisionPaqueteDTO {
    private Long id;
    private Long paqueteId;
    private MotivoRevisionPaquete motivo;
    private EstadoRevisionPaquete estado;
    private String observacionInicio;
    private LocalDateTime fechaInicio;
    private Long iniciadoPorUsuarioId;
    private String iniciadoPorUsername;
    private LocalDateTime fechaResolucion;
    private Long resueltoPorUsuarioId;
    private String resueltoPorUsername;
    private String observacionResolucion;
    private Long version;
}
