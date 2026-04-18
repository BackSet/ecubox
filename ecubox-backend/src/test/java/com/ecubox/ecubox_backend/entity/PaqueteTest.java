package com.ecubox.ecubox_backend.entity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PaqueteTest {

    @Test
    void componerNumeroGuia_formateaTrackingBaseConPiezaYTotal() {
        assertEquals("1Z52159R0379385035 2/3",
                Paquete.componerNumeroGuia("1Z52159R0379385035", 2, 3));
    }

    @Test
    void componerNumeroGuia_aceptaPaqueteUnico() {
        assertEquals("ABC987 1/1",
                Paquete.componerNumeroGuia("ABC987", 1, 1));
    }

    @Test
    void componerNumeroGuia_recortaEspaciosDelTrackingBase() {
        assertEquals("12312312312 1/2",
                Paquete.componerNumeroGuia("  12312312312  ", 1, 2));
    }

    @Test
    void componerNumeroGuia_rechazaTrackingBaseNullOBlanco() {
        assertThrows(IllegalArgumentException.class,
                () -> Paquete.componerNumeroGuia(null, 1, 1));
        assertThrows(IllegalArgumentException.class,
                () -> Paquete.componerNumeroGuia("", 1, 1));
        assertThrows(IllegalArgumentException.class,
                () -> Paquete.componerNumeroGuia("   ", 1, 1));
    }

    @Test
    void componerNumeroGuia_rechazaPiezaFueraDeRango() {
        assertThrows(IllegalArgumentException.class,
                () -> Paquete.componerNumeroGuia("BASE", 0, 3));
        assertThrows(IllegalArgumentException.class,
                () -> Paquete.componerNumeroGuia("BASE", 4, 3));
        assertThrows(IllegalArgumentException.class,
                () -> Paquete.componerNumeroGuia("BASE", 1, 0));
        assertThrows(IllegalArgumentException.class,
                () -> Paquete.componerNumeroGuia("BASE", -1, 3));
    }
}
