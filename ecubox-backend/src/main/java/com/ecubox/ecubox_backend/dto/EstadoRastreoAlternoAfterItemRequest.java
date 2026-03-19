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
public class EstadoRastreoAlternoAfterItemRequest {

    @NotNull(message = "estadoId es obligatorio")
    private Long estadoId;

    @NotNull(message = "afterEstadoId es obligatorio para estados alternos")
    private Long afterEstadoId;
}
