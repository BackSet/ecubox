CREATE TABLE paquete_estado_evento (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE,
    paquete_id BIGINT NOT NULL,
    estado_origen_id BIGINT NULL,
    estado_destino_id BIGINT NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    event_source VARCHAR(60) NOT NULL,
    actor_usuario_id BIGINT NULL,
    motivo_alterno TEXT NULL,
    en_flujo_alterno BOOLEAN NOT NULL DEFAULT FALSE,
    bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
    idempotency_key VARCHAR(160) NOT NULL UNIQUE,
    metadata_json TEXT NULL,
    occurred_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_paquete_estado_evento_paquete
        FOREIGN KEY (paquete_id) REFERENCES paquete(id),
    CONSTRAINT fk_paquete_estado_evento_origen
        FOREIGN KEY (estado_origen_id) REFERENCES estado_rastreo(id),
    CONSTRAINT fk_paquete_estado_evento_destino
        FOREIGN KEY (estado_destino_id) REFERENCES estado_rastreo(id),
    CONSTRAINT fk_paquete_estado_evento_actor
        FOREIGN KEY (actor_usuario_id) REFERENCES usuario(id)
);

CREATE INDEX idx_paquete_estado_evento_paquete_fecha
    ON paquete_estado_evento (paquete_id, occurred_at, id);

CREATE INDEX idx_paquete_estado_evento_tipo
    ON paquete_estado_evento (event_type, occurred_at);

CREATE TABLE outbox_event (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE,
    aggregate_type VARCHAR(80) NOT NULL,
    aggregate_id VARCHAR(120) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    payload_json TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL
);

CREATE INDEX idx_outbox_event_status_next_attempt
    ON outbox_event (status, next_attempt_at, id);
