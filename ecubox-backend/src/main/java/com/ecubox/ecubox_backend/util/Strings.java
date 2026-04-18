package com.ecubox.ecubox_backend.util;

/**
 * Utilidades de cadenas reutilizables en el backend.
 */
public final class Strings {

    private Strings() {}

    /**
     * Devuelve el {@code String} sin espacios al inicio/fin, o {@code null} si la
     * entrada es {@code null} o queda vacia tras el {@code trim()}.
     */
    public static String trimOrNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
