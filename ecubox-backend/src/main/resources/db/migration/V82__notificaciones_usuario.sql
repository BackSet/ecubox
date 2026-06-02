CREATE TABLE notificacion_usuario (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    paquete_id BIGINT,
    event_id UUID,
    tipo VARCHAR(60) NOT NULL,
    titulo VARCHAR(160) NOT NULL,
    mensaje TEXT NOT NULL,
    url VARCHAR(255),
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    CONSTRAINT fk_notificacion_usuario_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_notificacion_usuario_paquete
        FOREIGN KEY (paquete_id) REFERENCES paquete(id) ON DELETE SET NULL,
    CONSTRAINT uq_notificacion_usuario_event_id UNIQUE (event_id)
);

CREATE INDEX idx_notificacion_usuario_usuario_created
    ON notificacion_usuario (usuario_id, created_at DESC);

CREATE INDEX idx_notificacion_usuario_usuario_leida
    ON notificacion_usuario (usuario_id, leida, created_at DESC);
