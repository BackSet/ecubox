ALTER TABLE estado_rastreo
    ADD COLUMN IF NOT EXISTS after_estado_id BIGINT NULL;

ALTER TABLE estado_rastreo
    ADD CONSTRAINT fk_estado_rastreo_after_estado
        FOREIGN KEY (after_estado_id) REFERENCES estado_rastreo(id);

CREATE INDEX IF NOT EXISTS idx_estado_rastreo_after_estado
    ON estado_rastreo (after_estado_id);
