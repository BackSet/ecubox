package com.ecubox.ecubox_backend.config;

import com.ecubox.ecubox_backend.entity.Rol;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.repository.RolRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class AdminBootstrapRunner implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.bootstrap.enabled:false}")
    private boolean bootstrapEnabled;

    @Value("${admin.username:admin}")
    private String adminUsername;

    @Value("${admin.initial.password:}")
    private String adminInitialPassword;

    @Value("${admin.email:}")
    private String adminEmail;

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
        String normalizedAdminEmail = adminEmail == null ? "" : adminEmail.trim();
        if (normalizedAdminEmail.isBlank()) {
            log.warn("ADMIN bootstrap habilitado pero ADMIN_EMAIL no está definido. No se creará el usuario ADMIN.");
            return;
        }
        if (!normalizedAdminEmail.contains("@")) {
            log.warn("ADMIN bootstrap habilitado pero ADMIN_EMAIL no es válido ({}). No se creará el usuario ADMIN.", normalizedAdminEmail);
            return;
        }
        if (usuarioRepository.existsByRolesNombre("ADMIN")) {
            return;
        }
        Rol adminRol = rolRepository.findByNombre("ADMIN")
                .orElseThrow(() -> new IllegalStateException("Rol ADMIN no encontrado. Ejecutar migraciones Flyway."));

        Usuario admin = Usuario.builder()
                .username(adminUsername)
                .email(normalizedAdminEmail)
                .passwordHash(passwordEncoder.encode(adminInitialPassword))
                .enabled(true)
                .roles(Set.of(adminRol))
                .build();
        usuarioRepository.save(admin);
    }
}
