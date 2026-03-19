package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SacaAsignarPaquetesRequest {

    @NotEmpty(message = "Debe incluir al menos un paquete")
    private List<Long> paqueteIds;
}
