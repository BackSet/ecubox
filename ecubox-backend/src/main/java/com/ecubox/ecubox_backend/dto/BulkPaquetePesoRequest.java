package com.ecubox.ecubox_backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkPaquetePesoRequest {

    @NotEmpty(message = "La lista de pesos no puede estar vacía")
    @Size(max = 100, message = "Máximo 100 paquetes por lote")
    @Valid
    private List<PaquetePesoItem> items;
}
