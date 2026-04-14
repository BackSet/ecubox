package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.LoginRequest;
import com.ecubox.ecubox_backend.dto.LoginResponse;
import com.ecubox.ecubox_backend.dto.ClienteRegisterSimpleRequest;
import com.ecubox.ecubox_backend.entity.Permiso;
import com.ecubox.ecubox_backend.entity.Rol;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import com.ecubox.ecubox_backend.repository.PermisoRepository;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.JwtService;
import com.ecubox.ecubox_backend.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepository;
    private final UsuarioService usuarioService;
    private final CurrentUserService currentUserService;
    private final PermisoRepository permisoRepository;

    public AuthController(AuthenticationManager authenticationManager,
                          JwtService jwtService,
                          UsuarioRepository usuarioRepository,
                          UsuarioService usuarioService,
                          CurrentUserService currentUserService,
                          PermisoRepository permisoRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.usuarioRepository = usuarioRepository;
        this.usuarioService = usuarioService;
        this.currentUserService = currentUserService;
        this.permisoRepository = permisoRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        String username = authentication.getName();
        String token = jwtService.generateToken(username);

        Usuario usuario = usuarioRepository.findByUsernameWithRolesAndPermisos(username)
                .orElseThrow();

        List<String> roles = usuario.getRoles().stream()
                .map(Rol::getNombre)
                .toList();
        boolean isAdmin = roles.contains("ADMIN");
        List<String> permissions = isAdmin
                ? permisoRepository.findAll().stream().map(Permiso::getCodigo).collect(Collectors.toList())
                : usuario.getRoles().stream()
                        .flatMap(r -> r.getPermisos().stream())
                        .map(Permiso::getCodigo)
                        .distinct()
                        .collect(Collectors.toList());

        LoginResponse response = LoginResponse.builder()
                .token(token)
                .username(username)
                .roles(roles)
                .permissions(permissions)
                .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<LoginResponse> me() {
        Usuario usuario = currentUserService.getCurrentUsuario();
        List<String> roles = usuario.getRoles().stream()
                .map(Rol::getNombre)
                .toList();
        boolean isAdmin = roles.contains("ADMIN");
        List<String> permissions = isAdmin
                ? permisoRepository.findAll().stream().map(Permiso::getCodigo).collect(Collectors.toList())
                : usuario.getRoles().stream()
                        .flatMap(r -> r.getPermisos().stream())
                        .map(Permiso::getCodigo)
                        .distinct()
                        .collect(Collectors.toList());
        LoginResponse response = LoginResponse.builder()
                .token(null)
                .username(usuario.getUsername())
                .roles(roles)
                .permissions(permissions)
                .build();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register/simple")
    public ResponseEntity<Void> registerSimple(@Valid @RequestBody ClienteRegisterSimpleRequest request) {
        usuarioService.registerClienteSimple(request);
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).build();
    }
}
