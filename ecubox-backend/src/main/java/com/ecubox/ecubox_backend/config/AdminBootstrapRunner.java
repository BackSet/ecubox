package com.ecubox.ecubox_backend.config;

import com.ecubox.ecubox_backend.entity.Rol;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.repository.RolRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class AdminBootstrapRunner implements ApplicationRunner {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.bootstrap.enabled:false}")
    private boolean bootstrapEnabled;

    @Value("${admin.username:admin}")
    private String adminUsername;

    @Value("${admin.initial.password:}")
    private String adminInitialPassword;

    public AdminBootstrapRunner(UsuarioRepository usuarioRepository,
                                RolRepository rolRepository,
                                PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!bootstrapEnabled || adminInitialPassword == null || adminInitialPassword.isBlank()) {
            return;
        }
        if (usuarioRepository.existsByRolesNombre("ADMIN")) {
            return;
        }
        Rol adminRol = rolRepository.findByNombre("ADMIN")
                .orElseThrow(() -> new IllegalStateException("Rol ADMIN no encontrado. Ejecutar migraciones Flyway."));

        Usuario admin = Usuario.builder()
                .username(adminUsername)
                .passwordHash(passwordEncoder.encode(adminInitialPassword))
                .enabled(true)
                .roles(Set.of(adminRol))
                .build();
        usuarioRepository.save(admin);
    }
}
