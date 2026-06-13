package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.TrackingTipo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingExampleItemDTO {
    private String codigo;
    private String titulo;
    private String descripcion;
    private TrackingTipo tipo;
}
