package com.ecubox.ecubox_backend;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Carga el contexto completo de Spring (Flyway, PostgreSQL, etc.).
 * <p>
 * Sin base de datos accesible el arranque falla; por defecto este test está
 * desactivado. Para ejecutarlo: {@code ECUBOX_RUN_BOOT_CONTEXT_TEST=true mvn test}
 * con PostgreSQL configurado como en desarrollo.
 */
@EnabledIfEnvironmentVariable(named = "ECUBOX_RUN_BOOT_CONTEXT_TEST", matches = "true")
@SpringBootTest
class EcuboxSistemaDeGestionApplicationTests {

	@Test
	void contextLoads() {
	}

}
