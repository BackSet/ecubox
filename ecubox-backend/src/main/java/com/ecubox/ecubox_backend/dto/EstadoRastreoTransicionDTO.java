package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EstadoRastreoTransicionDTO {
    private Long id;
    private Long estadoOrigenId;
    private Long estadoDestinoId;
    private String estadoDestinoCodigo;
    private String estadoDestinoNombre;
    private Boolean requiereResolucion;
    private Boolean activo;
}

