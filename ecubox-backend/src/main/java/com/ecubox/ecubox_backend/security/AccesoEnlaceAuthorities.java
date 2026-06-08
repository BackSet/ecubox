package com.ecubox.ecubox_backend.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

/**
 * Autoridades de SOLO LECTURA de una sesión iniciada por enlace de acceso.
 *
 * No reutiliza permisos de cliente: el principal de la sesión es un
 * {@code AccesoEnlacePrincipal}, sin usuario real, y los endpoints de lectura
 * acotan los datos a los consignatarios vinculados al token.
 */
public final class AccesoEnlaceAuthorities {

    private AccesoEnlaceAuthorities() {
    }

    public static final List<String> CODIGOS = List.of(
            "ROLE_ACCESO_ENLACE",
            "CASILLERO_READ",
            "ACCESO_ENLACE_GUIAS_READ",
            "ACCESO_ENLACE_CONSIGNATARIOS_READ"
    );

    public static final List<GrantedAuthority> AUTHORITIES = CODIGOS.stream()
            .<GrantedAuthority>map(SimpleGrantedAuthority::new)
            .toList();
}
