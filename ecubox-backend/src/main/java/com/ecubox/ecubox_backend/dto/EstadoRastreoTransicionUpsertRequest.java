package com.ecubox.ecubox_backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EstadoRastreoTransicionUpsertRequest {
    @NotNull(message = "La lista de transiciones es obligatoria")
    @NotEmpty(message = "Debe enviar al menos una transición")
    @Valid
    private List<EstadoRastreoTransicionUpsertItem> transiciones;
}

