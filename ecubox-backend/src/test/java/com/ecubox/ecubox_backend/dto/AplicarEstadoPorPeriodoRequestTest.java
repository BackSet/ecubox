package com.ecubox.ecubox_backend.dto;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AplicarEstadoPorPeriodoRequestTest {

    @Test
    void rangoValidoCuandoInicioEsMenorOIgualAFin() {
        AplicarEstadoPorPeriodoRequest request = new AplicarEstadoPorPeriodoRequest(
                LocalDate.of(2026, 3, 1),
                LocalDate.of(2026, 3, 10),
                null
        );
        assertTrue(request.isRangoFechasValido());
    }

    @Test
    void rangoInvalidoCuandoInicioEsMayorQueFin() {
        AplicarEstadoPorPeriodoRequest request = new AplicarEstadoPorPeriodoRequest(
                LocalDate.of(2026, 3, 10),
                LocalDate.of(2026, 3, 1),
                null
        );
        assertFalse(request.isRangoFechasValido());
    }
}
