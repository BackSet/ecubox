package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AplicarEstadoPorPeriodoRequest {

    @NotNull(message = "La fecha de inicio es obligatoria")
    private LocalDate fechaInicio;

    @NotNull(message = "La fecha de fin es obligatoria")
    private LocalDate fechaFin;

    /** Si es null, se usa el estado configurado en parámetros (Estado cuando está en despacho). */
    private Long estadoRastreoId;

    @jakarta.validation.constraints.AssertTrue(message = "La fecha de inicio debe ser menor o igual a la fecha de fin")
    public boolean isRangoFechasValido() {
        if (fechaInicio == null || fechaFin == null) {
            return true;
        }
        return !fechaInicio.isAfter(fechaFin);
    }
}
