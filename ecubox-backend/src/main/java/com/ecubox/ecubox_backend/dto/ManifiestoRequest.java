package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.FiltroManifiesto;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManifiestoRequest {

    private String codigo;

    @NotNull(message = "La fecha de inicio es obligatoria")
    private LocalDate fechaInicio;

    @NotNull(message = "La fecha de fin es obligatoria")
    private LocalDate fechaFin;

    private FiltroManifiesto filtroTipo;

    /** Requerido cuando filtroTipo es POR_COURIER_ENTREGA (validado en servicio). */
    private Long filtroCourierEntregaId;

    /** Requerido cuando filtroTipo es POR_AGENCIA (validado en servicio). */
    private Long filtroAgenciaId;
}
