package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Item del selector de despachos disponibles para liquidar (seccion B). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DespachoDisponibleDTO {
    private Long id;
    private String numeroGuia;
    private String courierEntregaNombre;
    private LocalDateTime fechaHora;
    private BigDecimal pesoSugeridoLbs;
    private BigDecimal pesoSugeridoKg;
}
