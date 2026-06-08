package com.ecubox.ecubox_backend.security;

/**
 * Principal de una sesión iniciada por un enlace de acceso. No representa a un
 * usuario del sistema: solo identifica el enlace ({@code enlaceId}) para que los
 * endpoints de lectura resuelvan los consignatarios autorizados.
 */
public record AccesoEnlacePrincipal(Long enlaceId) {

    @Override
    public String toString() {
        return "acceso-enlace:" + enlaceId;
    }
}
