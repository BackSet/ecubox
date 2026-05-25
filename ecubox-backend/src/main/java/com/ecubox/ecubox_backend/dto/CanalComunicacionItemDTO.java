package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CanalComunicacionItemDTO {

    private String valor;
    /** Null en JSON almacenado legacy: con valor presente se interpreta como visible. */
    private Boolean visible;
}
