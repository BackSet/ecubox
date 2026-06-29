package com.ecubox.ecubox_backend.integration;

import com.ecubox.ecubox_backend.repository.EstadoRastreoRepository;
import com.ecubox.ecubox_backend.repository.PermisoRepository;
import com.ecubox.ecubox_backend.repository.RolRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Prueba de integracion de alto valor: arranca el contexto completo de Spring
 * sobre un PostgreSQL 18 real (Testcontainers) y verifica que la cadena de
 * migraciones Flyway de produccion se aplica correctamente y que el esquema
 * resultante valida contra las entidades JPA ({@code ddl-auto=validate}).
 *
 * <p>No ejercita reglas de negocio: solo confirma arranque, migraciones y mapeo
 * Entidad&lt;-&gt;esquema sobre la base de datos motor real.</p>
 */
class MigracionesContextoIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private PermisoRepository permisoRepository;

    @Autowired
    private EstadoRastreoRepository estadoRastreoRepository;

    @Test
    void contextoArrancaYContenedorEstaVivo() {
        // Si el contexto inyecta beans y el ddl-auto=validate no falla, el esquema
        // migrado por Flyway es consistente con las entidades JPA.
        assertThat(jdbcTemplate).isNotNull();
        assertThat(POSTGRES.isRunning()).isTrue();
    }

    @Test
    void flywayAplicoLasMigracionesDeProduccion() {
        Integer aplicadas = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE success = true AND version IS NOT NULL",
                Integer.class);

        assertThat(aplicadas)
                .as("Flyway debe haber aplicado al menos las migraciones versionadas (V1..)")
                .isNotNull()
                .isGreaterThan(0);
    }

    @Test
    void tablasNucleoDelDominioExisten() {
        for (String tabla : new String[] {"usuario", "rol", "permiso", "estado_rastreo", "paquete"}) {
            Boolean existe = jdbcTemplate.queryForObject(
                    "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
                            + "WHERE table_schema = 'public' AND table_name = ?)",
                    Boolean.class, tabla);
            assertThat(existe).as("La tabla '%s' debe existir tras migrar", tabla).isTrue();
        }
    }

    @Test
    void catalogosSembradosPorMigracionesSeMapeanConJpa() {
        // Roles base sembrados por migraciones (V3 / V89): valida el mapeo JPA de
        // Rol y Permiso leyendo desde el PostgreSQL real.
        assertThat(rolRepository.findByNombre("ADMIN")).isPresent();
        assertThat(rolRepository.findByNombre("OPERARIO")).isPresent();
        assertThat(rolRepository.findByNombre("CLIENTE")).isPresent();

        assertThat(permisoRepository.count())
                .as("El catalogo de permisos debe quedar sembrado por las migraciones")
                .isGreaterThan(0);

        assertThat(estadoRastreoRepository.count())
                .as("El catalogo de estados de rastreo debe quedar sembrado por las migraciones")
                .isGreaterThan(0);
    }
}
