package com.ecubox.ecubox_backend.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class StringsTest {

    @Test
    void trimOrNull_devuelveNullParaNull() {
        assertNull(Strings.trimOrNull(null));
    }

    @Test
    void trimOrNull_devuelveNullParaSoloEspacios() {
        assertNull(Strings.trimOrNull("   \t  "));
    }

    @Test
    void trimOrNull_recortaYConservaContenido() {
        assertEquals("hola", Strings.trimOrNull("  hola  "));
    }
}
