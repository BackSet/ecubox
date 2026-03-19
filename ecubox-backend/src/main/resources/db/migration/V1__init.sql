-- Migración inicial. Schema base para ECUBOX.
-- Las tablas de dominio (usuario, etc.) se añadirán en migraciones posteriores.

CREATE TABLE IF NOT EXISTS schema_version (
    version VARCHAR(32) PRIMARY KEY,
    description VARCHAR(255),
    installed_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE schema_version IS 'Control de versiones de schema (complemento a flyway_schema_history)';
