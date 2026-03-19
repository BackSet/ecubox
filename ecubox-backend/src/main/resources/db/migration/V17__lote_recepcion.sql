-- Lote de recepción: cabecera con fecha de recepción y observaciones (operario registra uno o varios lotes)
CREATE TABLE lote_recepcion (
    id BIGSERIAL PRIMARY KEY,
    fecha_recepcion TIMESTAMP NOT NULL,
    observaciones TEXT NULL,
    operario_id BIGINT NULL REFERENCES usuario(id) ON DELETE SET NULL
);
CREATE INDEX idx_lote_recepcion_fecha_recepcion ON lote_recepcion(fecha_recepcion DESC);
COMMENT ON TABLE lote_recepcion IS 'Lote de recepción registrado por operario; agrupa una o varias guías de envío';

-- Guías de envío pertenecientes a un lote (1 lote -> N guías)
CREATE TABLE lote_recepcion_guia (
    id BIGSERIAL PRIMARY KEY,
    lote_recepcion_id BIGINT NOT NULL REFERENCES lote_recepcion(id) ON DELETE CASCADE,
    numero_guia_envio VARCHAR(100) NOT NULL
);
CREATE INDEX idx_lote_recepcion_guia_lote_id ON lote_recepcion_guia(lote_recepcion_id);
CREATE INDEX idx_lote_recepcion_guia_numero ON lote_recepcion_guia(numero_guia_envio);
CREATE UNIQUE INDEX idx_lote_recepcion_guia_uk ON lote_recepcion_guia(lote_recepcion_id, numero_guia_envio);
COMMENT ON TABLE lote_recepcion_guia IS 'Guías de envío asociadas a un lote de recepción';
