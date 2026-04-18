-- Sprint 4: proyeccion de lectura optimizada para tracking publico.
--
-- Esta tabla es un read model denormalizado mantenido por TrackingViewProjector
-- a partir de los eventos del outbox. Permite resolver /api/v1/tracking sin
-- tocar las tablas transaccionales y sin joins costosos.
--
-- Reglas:
--   * No contiene PII sensible (telefono, direccion exacta).
--   * Es eventual-consistent; el endpoint cae al servicio transaccional como
--     fallback cuando la fila no existe o esta marcada stale.
--   * `last_event_id` se usa para idempotencia y deteccion de lag.

CREATE TABLE tracking_view_paquete (
    paquete_id              BIGINT PRIMARY KEY,
    numero_guia             VARCHAR(120) NOT NULL,
    tracking_base           VARCHAR(120) NULL,
    pieza_numero            INTEGER NULL,
    pieza_total             INTEGER NULL,
    estado_actual_id        BIGINT NULL,
    estado_actual_codigo    VARCHAR(60) NULL,
    estado_actual_nombre    VARCHAR(160) NULL,
    fecha_estado_desde      TIMESTAMP NULL,
    en_flujo_alterno        BOOLEAN NOT NULL DEFAULT FALSE,
    bloqueado               BOOLEAN NOT NULL DEFAULT FALSE,
    destinatario_id         BIGINT NULL,
    destinatario_nombre     VARCHAR(200) NULL,
    destinatario_provincia  VARCHAR(80) NULL,
    destinatario_canton     VARCHAR(80) NULL,
    last_event_id           BIGINT NULL,
    version                 BIGINT NOT NULL DEFAULT 0,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tracking_view_paquete
        FOREIGN KEY (paquete_id) REFERENCES paquete(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX ux_tracking_view_paquete_numero_guia
    ON tracking_view_paquete (numero_guia);

CREATE INDEX idx_tracking_view_paquete_tracking_base
    ON tracking_view_paquete (tracking_base);

CREATE INDEX idx_tracking_view_paquete_estado
    ON tracking_view_paquete (estado_actual_id);

CREATE INDEX idx_tracking_view_paquete_updated_at
    ON tracking_view_paquete (updated_at);

-- Estado del proyector (para healthchecks y reanudacion).
CREATE TABLE tracking_projector_state (
    name              VARCHAR(80) PRIMARY KEY,
    last_event_id     BIGINT NOT NULL DEFAULT 0,
    last_processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tracking_projector_state (name, last_event_id)
VALUES ('tracking_view_paquete', 0);
