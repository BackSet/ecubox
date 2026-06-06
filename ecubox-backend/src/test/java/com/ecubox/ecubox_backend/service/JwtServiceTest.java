package com.ecubox.ecubox_backend.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas unitarias de {@link JwtService}: generación, lectura de subject y
 * validación de firma sin contexto Spring.
 */
class JwtServiceTest {

    private static final String SECRET_32_BYTES = "01234567890123456789012345678901";
    private static final String ISSUER = "ecubox-test";

    @Test
    void secretCortoLanzaIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class,
                () -> new JwtService("demasiado-corto", 3_600_000L, ISSUER));
    }

    @Test
    void expiracionNoPositivaLanzaIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class,
                () -> new JwtService(SECRET_32_BYTES, 0, ISSUER));
    }

    @Test
    void generateToken_extractUsername_y_isTokenValid() {
        JwtService jwt = new JwtService(SECRET_32_BYTES, 3_600_000L, ISSUER);
        String token = jwt.generateToken("operario1");
        assertEquals("operario1", jwt.extractUsername(token));
        assertTrue(jwt.isTokenValid(token));
    }

    @Test
    void tokenManipuladoNoEsValido() {
        JwtService jwt = new JwtService(SECRET_32_BYTES, 3_600_000L, ISSUER);
        String token = jwt.generateToken("u1");
        String tampered = token.substring(0, token.length() - 4) + "XXXX";
        assertFalse(jwt.isTokenValid(tampered));
    }

    @Test
    void tokenDeOtroEmisorNoEsValido() {
        JwtService issuerA = new JwtService(SECRET_32_BYTES, 3_600_000L, "issuer-a");
        JwtService issuerB = new JwtService(SECRET_32_BYTES, 3_600_000L, "issuer-b");
        assertFalse(issuerB.isTokenValid(issuerA.generateToken("u1")));
    }
}
