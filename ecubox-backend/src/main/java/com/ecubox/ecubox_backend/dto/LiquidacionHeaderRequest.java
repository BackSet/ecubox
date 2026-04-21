package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** Actualiza el header de una liquidacion (fecha del documento, periodo, notas). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiquidacionHeaderRequest {

    @NotNull(message = "La fecha del documento es obligatoria")
    private LocalDate fechaDocumento;

    private LocalDate periodoDesde;

    private LocalDate periodoHasta;

    @Size(max = 4000, message = "Las notas no pueden superar 4000 caracteres")
    private String notas;
}
