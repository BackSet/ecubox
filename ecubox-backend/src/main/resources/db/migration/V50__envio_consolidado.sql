-- Promueve numero_guia_envio (string repetible) a entidad envio_consolidado
-- con maquina de estados, fechas de tracking y metadata para el envio
-- consolidado USA -> Ecuador.

CREATE TABLE envio_consolidado (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(100) NOT NULL,
    estado VARCHAR(40) NOT NULL DEFAULT 'ABIERTO',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_envio_usa TIMESTAMP NULL,
    fecha_arribo_ec TIMESTAMP NULL,
    fecha_recibido_ec TIMESTAMP NULL,
    fecha_cerrado TIMESTAMP NULL,
    origen_oficina VARCHAR(120) NULL,
    destino VARCHAR(120) NULL,
    peso_total_lbs NUMERIC(12, 4) NULL,
    total_paquetes INT NOT NULL DEFAULT 0,
    observaciones TEXT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_envio_consolidado_estado CHECK (
        estado IN ('ABIERTO', 'ENVIADO_USA', 'EN_TRANSITO', 'ARRIBADO_EC', 'RECIBIDO', 'CERRADO')
    )
);

CREATE UNIQUE INDEX idx_envio_consolidado_codigo_upper
    ON envio_consolidado ((UPPER(codigo)));

CREATE INDEX idx_envio_consolidado_estado_activo
    ON envio_consolidado (estado)
    WHERE estado IN ('ABIERTO', 'ENVIADO_USA', 'EN_TRANSITO', 'ARRIBADO_EC', 'RECIBIDO');

CREATE INDEX idx_envio_consolidado_fecha_creacion
    ON envio_consolidado (fecha_creacion DESC);

COMMENT ON TABLE envio_consolidado IS
    'Envio consolidado USA -> Ecuador; agrupa N paquetes (cada uno con su propia guia y guia master)';
COMMENT ON COLUMN envio_consolidado.codigo IS
    'Codigo del envio asignado en oficina USA antes del envio (ej: 86156)';
COMMENT ON COLUMN envio_consolidado.estado IS
    'ABIERTO -> ENVIADO_USA -> EN_TRANSITO -> ARRIBADO_EC -> RECIBIDO -> CERRADO';
