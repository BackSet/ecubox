package com.ecubox.ecubox_backend.security;

import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    private final UsuarioRepository usuarioRepository;

    public CurrentUserService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    /**
     * Obtiene el usuario actual desde el contexto de seguridad (JWT).
     */
    public Usuario getCurrentUsuario() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            throw new ResourceNotFoundException("Usuario no autenticado");
        }
        String username = auth.getName();
        return usuarioRepository.findByUsernameWithRolesAndPermisos(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", username));
    }

    /**
     * Indica si el usuario actual tiene el rol con el nombre dado (ej. "OPERARIO").
     */
    public boolean hasRole(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return false;
        }
        Usuario u = getCurrentUsuario();
        return u.getRoles() != null && u.getRoles().stream()
                .anyMatch(r -> roleName.equalsIgnoreCase(r.getNombre()));
    }

    /**
     * Indica si el usuario actual tiene el permiso (authority) dado (ej. "DESTINATARIOS_OPERARIO").
     */
    public boolean hasAuthority(String authority) {
        if (authority == null || authority.isBlank()) {
            return false;
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null) {
            return false;
        }
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> authority.equals(a));
    }
}
