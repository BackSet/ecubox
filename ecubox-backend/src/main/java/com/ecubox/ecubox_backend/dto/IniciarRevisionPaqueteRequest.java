package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.MotivoRevisionPaquete;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class IniciarRevisionPaqueteRequest {
    @NotNull
    private MotivoRevisionPaquete motivo;
    private String observacion;
}
