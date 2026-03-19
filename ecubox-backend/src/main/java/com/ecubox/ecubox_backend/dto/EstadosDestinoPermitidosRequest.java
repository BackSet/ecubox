package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EstadosDestinoPermitidosRequest {
    @NotEmpty(message = "La lista de paquetes no puede estar vacía")
    private List<Long> paqueteIds;
}

