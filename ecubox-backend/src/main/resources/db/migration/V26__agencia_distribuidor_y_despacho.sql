-- Agencia de distribuidor: puntos del distribuidor con su propia logística.
-- Despacho puede ser tipo AGENCIA_DISTRIBUIDOR apuntando a una agencia del distribuidor.

CREATE TABLE agencia_distribuidor (
    id BIGSERIAL PRIMARY KEY,
    distribuidor_id BIGINT NOT NULL REFERENCES distribuidor(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    provincia VARCHAR(100),
    canton VARCHAR(100),
    direccion TEXT,
    horario_atencion TEXT,
    tarifa DECIMAL(19,4) NOT NULL DEFAULT 0,
    CONSTRAINT uq_agencia_distribuidor_distribuidor_codigo UNIQUE (distribuidor_id, codigo)
);

CREATE INDEX idx_agencia_distribuidor_distribuidor_id ON agencia_distribuidor(distribuidor_id);

COMMENT ON TABLE agencia_distribuidor IS 'Agencias que pertenecen al distribuidor; usadas en despacho tipo AGENCIA_DISTRIBUIDOR';

ALTER TABLE despacho ADD COLUMN agencia_distribuidor_id BIGINT REFERENCES agencia_distribuidor(id) ON DELETE SET NULL;
CREATE INDEX idx_despacho_agencia_distribuidor_id ON despacho(agencia_distribuidor_id);

ALTER TABLE despacho DROP CONSTRAINT chk_despacho_tipo_entrega;
ALTER TABLE despacho ADD CONSTRAINT chk_despacho_tipo_entrega CHECK (
    (tipo_entrega = 'DOMICILIO' AND destinatario_final_id IS NOT NULL AND agencia_id IS NULL AND agencia_distribuidor_id IS NULL) OR
    (tipo_entrega = 'AGENCIA' AND agencia_id IS NOT NULL AND destinatario_final_id IS NULL AND agencia_distribuidor_id IS NULL) OR
    (tipo_entrega = 'AGENCIA_DISTRIBUIDOR' AND agencia_distribuidor_id IS NOT NULL AND destinatario_final_id IS NULL AND agencia_id IS NULL)
);

-- Permisos para CRUD de agencias de distribuidor (admin)
INSERT INTO permiso (codigo, descripcion) VALUES
    ('AGENCIAS_DISTRIBUIDOR_READ', 'Ver listado y detalle de agencias de distribuidor'),
    ('AGENCIAS_DISTRIBUIDOR_WRITE', 'Crear, editar y eliminar agencias de distribuidor');

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'ADMIN' AND p.codigo IN ('AGENCIAS_DISTRIBUIDOR_READ', 'AGENCIAS_DISTRIBUIDOR_WRITE');
