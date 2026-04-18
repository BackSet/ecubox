package com.ecubox.ecubox_backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Configuracion solo activa en perfil dev: ejecuta {@code flyway.repair()}
 * antes de cada {@code migrate()} para tolerar cambios en migraciones que ya
 * fueron aplicadas en la base local (resetea el checksum).
 *
 * Esto NO se activa en prod, donde cualquier cambio a una migracion ya
 * aplicada debe ser tratado como un error.
 */
@Configuration
@Profile("dev")
public class DevFlywayConfig {

    private static final Logger log = LoggerFactory.getLogger(DevFlywayConfig.class);

    @Bean
    public FlywayMigrationStrategy repairAndMigrateStrategy() {
        return flyway -> {
            log.info("[dev] Ejecutando flyway.repair() antes de migrar para tolerar checksums modificados");
            flyway.repair();
            flyway.migrate();
        };
    }
}
