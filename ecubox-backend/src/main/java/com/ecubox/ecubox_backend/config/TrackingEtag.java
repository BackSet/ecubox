package com.ecubox.ecubox_backend.config;

import com.ecubox.ecubox_backend.dto.TrackingResolveResponse;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Construye un ETag estable para respuestas publicas de tracking.
 * Resumen SHA-256 truncado a 16 caracteres hex sobre el payload público
 * completo. Así, cambios de catálogo, leyendas, orden, plazos o modalidad de
 * entrega invalidan correctamente la caché aunque el estado actual no cambie.
 */
public final class TrackingEtag {

    private TrackingEtag() {}

    public static String of(TrackingResolveResponse r) {
        if (r == null || r.getTipo() == null) {
            return null;
        }
        return "\"" + hash(r.toString()) + "\"";
    }

    private static String hash(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(32);
            for (int i = 0; i < 8; i++) {
                hex.append(String.format("%02x", digest[i]));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }
}
