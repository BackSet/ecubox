package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuiaMasterCreateRequest {

    @NotBlank(message = "El tracking base es obligatorio")
    private String trackingBase;

    @Min(value = 1, message = "Debe tener al menos una pieza")
    private Integer totalPiezasEsperadas;

    private Long consignatarioId;
}
