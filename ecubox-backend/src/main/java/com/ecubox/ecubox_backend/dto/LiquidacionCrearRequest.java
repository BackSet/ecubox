package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** Crea un documento de liquidacion vacio (sin lineas). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiquidacionCrearRequest {

    /** Si es nulo, se usa la fecha actual. */
    private LocalDate fechaDocumento;

    private LocalDate periodoDesde;

    private LocalDate periodoHasta;

    @Size(max = 4000, message = "Las notas no pueden superar 4000 caracteres")
    private String notas;
}
