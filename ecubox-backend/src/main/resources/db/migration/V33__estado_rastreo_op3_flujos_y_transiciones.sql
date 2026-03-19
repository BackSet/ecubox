ALTER TABLE estado_rastreo
    ADD COLUMN tipo_flujo VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    ADD COLUMN bloqueante BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN publico_tracking BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE paquete
    ADD COLUMN en_flujo_alterno BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN motivo_alterno TEXT NULL,
    ADD COLUMN bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN fecha_bloqueo_desde TIMESTAMP NULL;

CREATE TABLE estado_rastreo_transicion (
    id BIGSERIAL PRIMARY KEY,
    estado_origen_id BIGINT NOT NULL,
    estado_destino_id BIGINT NOT NULL,
    requiere_resolucion BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_estado_rastreo_transicion_origen
        FOREIGN KEY (estado_origen_id) REFERENCES estado_rastreo(id),
    CONSTRAINT fk_estado_rastreo_transicion_destino
        FOREIGN KEY (estado_destino_id) REFERENCES estado_rastreo(id),
    CONSTRAINT uk_estado_rastreo_transicion_origen_destino
        UNIQUE (estado_origen_id, estado_destino_id)
);

-- Seed inicial: mantener comportamiento operativo permitiendo transición entre estados activos.
INSERT INTO estado_rastreo_transicion (estado_origen_id, estado_destino_id, requiere_resolucion, activo)
SELECT e1.id, e2.id, FALSE, TRUE
FROM estado_rastreo e1
JOIN estado_rastreo e2 ON e1.id <> e2.id
WHERE e1.activo = TRUE
  AND e2.activo = TRUE;

