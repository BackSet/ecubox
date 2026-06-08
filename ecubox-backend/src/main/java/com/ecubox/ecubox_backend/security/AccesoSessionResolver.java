package com.ecubox.ecubox_backend.security;

import com.ecubox.ecubox_backend.entity.AccesoEnlace;
import com.ecubox.ecubox_backend.service.AccesoEnlaceService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Resuelve, para la petición actual, si la sesión proviene de un enlace de
 * acceso y, en ese caso, qué consignatarios puede ver. Permite que los
 * endpoints de cliente ({@code /api/mis-guias}, {@code /api/mis-consignatarios})
 * reutilicen sus vistas acotando los datos al enlace en lugar de a un usuario.
 */
@Component
public class AccesoSessionResolver {

    private final AccesoEnlaceService accesoEnlaceService;

    public AccesoSessionResolver(AccesoEnlaceService accesoEnlaceService) {
        this.accesoEnlaceService = accesoEnlaceService;
    }

    /** Indica si la petición actual es una sesión iniciada por enlace de acceso. */
    public boolean isEnlaceSession() {
        return principal() != null;
    }

    /**
     * Consignatarios autorizados por el enlace de la sesión actual. Lanza si el
     * enlace fue revocado o caducó (revocación inmediata).
     */
    public Set<Long> consignatarioScope() {
        AccesoEnlacePrincipal p = principal();
        if (p == null || p.enlaceId() == null) {
            return Set.of();
        }
        AccesoEnlace enlace = accesoEnlaceService.obtenerVigente(p.enlaceId());
        return accesoEnlaceService.consignatarioIds(enlace);
    }

    private AccesoEnlacePrincipal principal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AccesoEnlacePrincipal p) {
            return p;
        }
        return null;
    }
}
