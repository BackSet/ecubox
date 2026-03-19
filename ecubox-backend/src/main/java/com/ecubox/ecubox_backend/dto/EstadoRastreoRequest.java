package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
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
public class EstadoRastreoRequest {

    @NotBlank(message = "El código es obligatorio")
    private String codigo;

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    @Min(value = 0, message = "El orden debe ser mayor o igual a 0")
    private Integer orden;

    @Min(value = 0, message = "El orden de tracking debe ser mayor o igual a 0")
    private Integer ordenTracking;

    private Long afterEstadoId;

    @Builder.Default
    private Boolean activo = true;

    private String leyenda;

    @Builder.Default
    private TipoFlujoEstado tipoFlujo = TipoFlujoEstado.NORMAL;

    @Builder.Default
    private Boolean bloqueante = false;

    @Builder.Default
    private Boolean publicoTracking = true;
}
