-- Despacho: operario (usuario que crea) y fecha/hora del lote
ALTER TABLE despacho
    ADD COLUMN operario_id BIGINT REFERENCES usuario(id) ON DELETE SET NULL,
    ADD COLUMN fecha_hora TIMESTAMP NOT NULL DEFAULT current_timestamp;

CREATE INDEX idx_despacho_operario_id ON despacho(operario_id);

COMMENT ON COLUMN despacho.operario_id IS 'Usuario operario que registró el despacho';
COMMENT ON COLUMN despacho.fecha_hora IS 'Fecha y hora del lote/despacho (editable por el operario)';
