package com.ecubox.ecubox_backend.config;

import com.ecubox.ecubox_backend.dto.TrackingMasterResponse;
import com.ecubox.ecubox_backend.dto.TrackingResolveResponse;
import com.ecubox.ecubox_backend.dto.TrackingResponse;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Construye un ETag estable para respuestas publicas de tracking.
 * Resumen SHA-256 truncado a 16 caracteres hex sobre los campos identificadores
 * relevantes (estado y timestamps), suficiente para cache HTTP y revalidacion.
 */
public final class TrackingEtag {

    private TrackingEtag() {}

    public static String of(TrackingResolveResponse r) {
        if (r == null || r.getTipo() == null) {
            return null;
        }
        StringBuilder sb = new StringBuilder(160);
        sb.append(r.getTipo().name()).append('|');
        switch (r.getTipo()) {
            case PIEZA -> appendPieza(sb, r.getPieza());
            case GUIA_MASTER -> appendMaster(sb, r.getMaster());
        }
        return "\"" + hash(sb.toString()) + "\"";
    }

    private static void appendPieza(StringBuilder sb, TrackingResponse p) {
        if (p == null) return;
        sb.append(safe(p.getNumeroGuia())).append('|')
                .append(safe(p.getEstadoActualId())).append('|')
                .append(safe(p.getFechaEstadoDesde())).append('|')
                .append(safe(p.getFlujoActual())).append('|')
                .append(safe(p.getBloqueado()));
    }

    private static void appendMaster(StringBuilder sb, TrackingMasterResponse m) {
        if (m == null) return;
        sb.append(safe(m.getTrackingBase())).append('|')
                .append(safe(m.getEstadoGlobal())).append('|')
                .append(safe(m.getUltimaActualizacion())).append('|')
                .append(safe(m.getPiezasRegistradas())).append('|')
                .append(safe(m.getPiezasRecibidas())).append('|')
                .append(safe(m.getPiezasDespachadas()));
    }

    private static String safe(Object o) {
        return o == null ? "" : o.toString();
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
