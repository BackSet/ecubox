CREATE TABLE web_push_subscription (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    failure_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_success_at TIMESTAMP,
    last_failure_at TIMESTAMP,
    CONSTRAINT fk_web_push_subscription_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT uq_web_push_subscription_endpoint UNIQUE (endpoint)
);

CREATE INDEX idx_web_push_subscription_usuario_active
    ON web_push_subscription (usuario_id, active);
