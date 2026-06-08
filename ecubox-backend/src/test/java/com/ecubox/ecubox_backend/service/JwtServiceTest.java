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
    private static final long EXPIRATION_MS = 3_600_000L;
    private static final long ACCESO_EXPIRATION_MS = 1_800_000L;

    @Test
    void secretCortoLanzaIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class,
                () -> new JwtService("demasiado-corto", EXPIRATION_MS, ACCESO_EXPIRATION_MS, ISSUER));
    }

    @Test
    void expiracionNoPositivaLanzaIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class,
                () -> new JwtService(SECRET_32_BYTES, 0, ACCESO_EXPIRATION_MS, ISSUER));
    }

    @Test
    void expiracionAccesoNoPositivaLanzaIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class,
                () -> new JwtService(SECRET_32_BYTES, EXPIRATION_MS, 0, ISSUER));
    }

    @Test
    void generateToken_extractUsername_y_isTokenValid() {
        JwtService jwt = jwtService(ISSUER);
        String token = jwt.generateToken("operario1");
        assertEquals("operario1", jwt.extractUsername(token));
        assertTrue(jwt.isTokenValid(token));
    }

    @Test
    void tokenManipuladoNoEsValido() {
        JwtService jwt = jwtService(ISSUER);
        String token = jwt.generateToken("u1");
        String tampered = token.substring(0, token.length() - 4) + "XXXX";
        assertFalse(jwt.isTokenValid(tampered));
    }

    @Test
    void tokenDeOtroEmisorNoEsValido() {
        JwtService issuerA = jwtService("issuer-a");
        JwtService issuerB = jwtService("issuer-b");
        assertFalse(issuerB.isTokenValid(issuerA.generateToken("u1")));
    }

    @Test
    void generateAccesoEnlaceToken_incluyeMarcadorYEnlaceId() {
        JwtService jwt = jwtService(ISSUER);
        String token = jwt.generateAccesoEnlaceToken(42L);

        assertTrue(jwt.isTokenValid(token));
        assertTrue(jwt.isAccesoEnlaceToken(token));
        assertEquals(42L, jwt.extractEnlaceId(token));
    }

    private JwtService jwtService(String issuer) {
        return new JwtService(SECRET_32_BYTES, EXPIRATION_MS, ACCESO_EXPIRATION_MS, issuer);
    }
}
