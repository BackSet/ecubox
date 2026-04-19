package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.ClienteRegisterSimpleRequest;
import com.ecubox.ecubox_backend.dto.MeUpdateRequest;
import com.ecubox.ecubox_backend.dto.UsuarioCreateRequest;
import com.ecubox.ecubox_backend.dto.UsuarioDTO;
import com.ecubox.ecubox_backend.dto.UsuarioUpdateRequest;
import com.ecubox.ecubox_backend.entity.Rol;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.RolRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import com.ecubox.ecubox_backend.util.SearchSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository,
                          RolRepository rolRepository,
                          PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UsuarioDTO> findAll() {
        return usuarioRepository.findAllWithRoles().stream()
                .map(this::toDTO)
                .toList();
    }

    /**
     * Lista paginada con búsqueda libre (LIKE multi-token) sobre {@code username}
     * y {@code email}. La entidad {@code Usuario} no expone un campo {@code nombre}
     * separado.
     */
    @Transactional(readOnly = true)
    public Page<UsuarioDTO> findAllPaginated(String q, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page),
                Math.max(1, Math.min(100, size)),
                Sort.by(Sort.Direction.ASC, "username").and(Sort.by(Sort.Direction.ASC, "id")));
        Specification<Usuario> spec = SearchSpecifications.tokensLike(q,
                SearchSpecifications.field("username"),
                SearchSpecifications.field("email"));
        return usuarioRepository.findAll(spec, pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public UsuarioDTO findById(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", id));
        return toDTO(usuario);
    }

    @Transactional
    public UsuarioDTO create(UsuarioCreateRequest request) {
        if (usuarioRepository.findByUsernameWithRolesAndPermisos(request.getUsername()).isPresent()) {
            throw new BadRequestException("Ya existe un usuario con ese nombre de usuario");
        }
        Set<Rol> roles = resolveRoles(request.getRoleIds());
        Usuario usuario = Usuario.builder()
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .enabled(!Boolean.FALSE.equals(request.getEnabled()))
                .roles(roles)
                .build();
        usuario = usuarioRepository.save(usuario);
        return toDTO(usuario);
    }

    @Transactional
    public UsuarioDTO update(Long id, UsuarioUpdateRequest request) {
        Usuario usuario = usuarioRepository.findByIdWithRoles(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", id));
        if (request.getEmail() != null) {
            usuario.setEmail(request.getEmail());
        }
        if (request.getEnabled() != null) {
            usuario.setEnabled(request.getEnabled());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            usuario.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getRoleIds() != null) {
            usuario.setRoles(resolveRoles(request.getRoleIds()));
        }
        usuario = usuarioRepository.save(usuario);
        return toDTO(usuario);
    }

    @Transactional
    public void deleteById(Long id) {
        if (!usuarioRepository.existsById(id)) {
            throw new ResourceNotFoundException("Usuario", id);
        }
        usuarioRepository.deleteById(id);
    }

    /**
     * Actualizacion self-service del usuario autenticado.
     *
     * - Permite cambiar email y/o contrasena.
     * - Para cambiar la contrasena se exige {@code currentPassword} valida.
     * - El email debe ser unico (case-insensitive) entre todos los usuarios.
     * - No permite cambiar username, roles ni el flag enabled.
     */
    @Transactional
    public UsuarioDTO updateSelf(Long id, MeUpdateRequest request) {
        Usuario usuario = usuarioRepository.findByIdWithRoles(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", id));

        boolean wantsPasswordChange = request.getNewPassword() != null && !request.getNewPassword().isBlank();
        if (wantsPasswordChange) {
            String current = request.getCurrentPassword();
            if (current == null || current.isBlank()) {
                throw new BadRequestException("Debes ingresar tu contrasena actual para cambiarla");
            }
            if (!passwordEncoder.matches(current, usuario.getPasswordHash())) {
                throw new BadRequestException("La contrasena actual no es correcta");
            }
            usuario.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        }

        if (request.getEmail() != null) {
            String trimmed = request.getEmail().trim();
            if (trimmed.isEmpty()) {
                usuario.setEmail(null);
            } else if (!trimmed.equalsIgnoreCase(usuario.getEmail())) {
                if (usuarioRepository.existsByEmailIgnoreCase(trimmed)) {
                    throw new ConflictException("Ya existe una cuenta con ese correo electronico");
                }
                usuario.setEmail(trimmed);
            }
        }

        usuario = usuarioRepository.save(usuario);
        return toDTO(usuario);
    }

    @Transactional
    public UsuarioDTO registerClienteSimple(ClienteRegisterSimpleRequest request) {
        if (usuarioRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new ConflictException("Ya existe una cuenta con ese correo electrónico");
        }
        Rol clienteRol = rolRepository.findByNombre("CLIENTE")
                .orElseThrow(() -> new IllegalStateException("Rol CLIENTE no encontrado. Ejecutar migraciones Flyway."));
        String baseUsername = request.getEmail().split("@")[0].replaceAll("[^a-zA-Z0-9]", "");
        if (baseUsername.isEmpty()) {
            baseUsername = "cliente";
        }
        String username = baseUsername;
        int suffix = 0;
        while (usuarioRepository.findByUsernameWithRolesAndPermisos(username).isPresent()) {
            username = baseUsername + ++suffix;
        }
        Usuario usuario = Usuario.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail().trim())
                .enabled(true)
                .roles(new HashSet<>(List.of(clienteRol)))
                .build();
        usuario = usuarioRepository.save(usuario);
        return toDTO(usuario);
    }

    private UsuarioDTO toDTO(Usuario u) {
        List<String> roleNames = u.getRoles().stream().map(Rol::getNombre).toList();
        return UsuarioDTO.builder()
                .id(u.getId())
                .username(u.getUsername())
                .email(u.getEmail())
                .enabled(u.getEnabled())
                .roles(roleNames)
                .build();
    }

    private Set<Rol> resolveRoles(List<Long> roleIds) {
        if (roleIds == null || roleIds.isEmpty()) {
            return new HashSet<>();
        }
        List<Rol> roles = rolRepository.findAllById(roleIds);
        if (roles.size() != roleIds.size()) {
            throw new BadRequestException("Uno o más roles no existen");
        }
        return new HashSet<>(roles);
    }
}
