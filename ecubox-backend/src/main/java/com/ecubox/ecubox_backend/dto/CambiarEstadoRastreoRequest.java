package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CambiarEstadoRastreoRequest {

    @NotNull(message = "El estado de rastreo es obligatorio")
    private Long estadoRastreoId;

    private String motivoAlterno;
}
