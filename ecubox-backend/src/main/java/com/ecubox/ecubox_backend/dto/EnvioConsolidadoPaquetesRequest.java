package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnvioConsolidadoPaquetesRequest {

    @NotEmpty(message = "Debe indicar al menos un paquete")
    private List<Long> paqueteIds;
}
