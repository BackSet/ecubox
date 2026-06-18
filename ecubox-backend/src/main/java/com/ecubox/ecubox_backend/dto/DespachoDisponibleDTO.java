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
    /**
     * Suma del peso (lbs) de los paquetes <b>con peso registrado</b>. Es un peso
     * <b>parcial</b> cuando {@code pesoCompleto} es {@code false}: no debe
     * presentarse como definitivo ni usarse para calcular importes finales.
     */
    private BigDecimal pesoSugeridoLbs;
    private BigDecimal pesoSugeridoKg;
    /** Total de paquetes que viajan en el despacho. */
    private long totalPaquetes;
    /** Paquetes sin peso registrado (peso pendiente, dato desconocido — no cero). */
    private long paquetesSinPeso;
    /** {@code true} solo si hay paquetes y todos tienen peso registrado. */
    private boolean pesoCompleto;
}
