package com.ecubox.ecubox_backend.security;

import com.ecubox.ecubox_backend.entity.Permiso;
import com.ecubox.ecubox_backend.entity.Rol;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.repository.PermisoRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;
    private final PermisoRepository permisoRepository;

    public CustomUserDetailsService(UsuarioRepository usuarioRepository,
                                    PermisoRepository permisoRepository) {
        this.usuarioRepository = usuarioRepository;
        this.permisoRepository = permisoRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByUsernameWithRolesAndPermisos(identifier)
                .or(() -> usuarioRepository.findByEmailIgnoreCaseWithRolesAndPermisos(identifier))
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + identifier));

        List<GrantedAuthority> authorities = new ArrayList<>();
        boolean isAdmin = usuario.getRoles().stream()
                .anyMatch(r -> "ADMIN".equals(r.getNombre()));

        for (Rol rol : usuario.getRoles()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + rol.getNombre()));
            if (!isAdmin) {
                for (Permiso permiso : rol.getPermisos()) {
                    authorities.add(new SimpleGrantedAuthority(permiso.getCodigo()));
                }
            }
        }
        if (isAdmin) {
            permisoRepository.findAll().forEach(p ->
                    authorities.add(new SimpleGrantedAuthority(p.getCodigo())));
        }

        return new CustomUserDetails(
                usuario.getUsername(),
                usuario.getPasswordHash(),
                authorities,
                Boolean.TRUE.equals(usuario.getEnabled())
        );
    }
}
