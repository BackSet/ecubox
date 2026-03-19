package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EstadoRastreoTransicionUpsertItem {
    @NotNull(message = "El estado destino es obligatorio")
    private Long estadoDestinoId;
    @NotNull(message = "El flag de resolución es obligatorio")
    private Boolean requiereResolucion;
    @NotNull(message = "El flag activo es obligatorio")
    private Boolean activo;
}

