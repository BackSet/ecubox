package com.ecubox.ecubox_backend.integration;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Base de las pruebas de integracion que requieren una base de datos PostgreSQL
 * real (NO H2): levanta un contenedor PostgreSQL 18 con Testcontainers y deja
 * que Flyway aplique las migraciones de produccion (perfil {@code test}).
 *
 * <p>Se usa la version 18 para coincidir con desarrollo/produccion (la cadena de
 * migraciones depende de {@code flyway-database-postgresql} para PostgreSQL 18).</p>
 *
 * <p>El contenedor es un <em>singleton</em> a nivel de JVM: se arranca una sola
 * vez y se reutiliza en todas las clases de prueba que extienden esta base;
 * Ryuk (Testcontainers) lo detiene al finalizar la suite.</p>
 *
 * <p><strong>Requiere Docker</strong> en el entorno de ejecucion. En maquinas sin
 * Docker estas pruebas fallaran al intentar arrancar el contenedor; el pipeline
 * de CI (ubuntu-latest) si dispone de Docker.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
public abstract class AbstractPostgresIntegrationTest {

    static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer(DockerImageName.parse("postgres:18-alpine"));

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
