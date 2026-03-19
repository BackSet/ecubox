-- Estados de rastreo como entidad (CRUD) y asignación por puntos
-- 1. Tabla estado_rastreo
CREATE TABLE estado_rastreo (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE estado_rastreo IS 'Catálogo de estados de rastreo; operario/admin pueden crear y asignar por puntos';

INSERT INTO estado_rastreo (codigo, nombre, orden, activo) VALUES
    ('REGISTRADO', 'Registrado', 1, true),
    ('EN_USA', 'En USA', 2, true),
    ('EN_ECUADOR', 'En Ecuador', 3, true),
    ('CONSOLIDADO', 'Consolidado', 4, true),
    ('EN_TRANSITO', 'En tránsito', 5, true);

-- 2. Cambiar paquete de enum (VARCHAR) a FK estado_rastreo_id
ALTER TABLE paquete ADD COLUMN estado_rastreo_id BIGINT NULL;

UPDATE paquete p
SET estado_rastreo_id = er.id
FROM estado_rastreo er
WHERE er.codigo = p.estado_rastreo;

ALTER TABLE paquete ALTER COLUMN estado_rastreo_id SET NOT NULL;
ALTER TABLE paquete ADD CONSTRAINT fk_paquete_estado_rastreo
    FOREIGN KEY (estado_rastreo_id) REFERENCES estado_rastreo(id) ON DELETE RESTRICT;
CREATE INDEX idx_paquete_estado_rastreo_id ON paquete(estado_rastreo_id);

ALTER TABLE paquete DROP COLUMN estado_rastreo;

-- 3. Parámetros de sistema: estado por punto (valor = ID del estado_rastreo)
-- Por defecto el estado REGISTRADO (id=1) para los tres puntos
INSERT INTO parametro_sistema (clave, valor) VALUES
    ('estado_rastreo_registro_paquete', '1'),
    ('estado_rastreo_en_lote_recepcion', '1'),
    ('estado_rastreo_en_despacho', '1')
ON CONFLICT (clave) DO NOTHING;

-- 4. Permisos estados de rastreo
INSERT INTO permiso (codigo, descripcion) VALUES
    ('ESTADOS_RASTREO_READ', 'Ver catálogo de estados de rastreo y configuración por punto'),
    ('ESTADOS_RASTREO_CREATE', 'Crear estado de rastreo'),
    ('ESTADOS_RASTREO_UPDATE', 'Editar estado de rastreo'),
    ('ESTADOS_RASTREO_DELETE', 'Eliminar o desactivar estado de rastreo');

-- OPERARIO y ADMIN: todos los permisos de estados de rastreo
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre IN ('OPERARIO', 'ADMIN') AND p.codigo IN (
    'ESTADOS_RASTREO_READ', 'ESTADOS_RASTREO_CREATE', 'ESTADOS_RASTREO_UPDATE', 'ESTADOS_RASTREO_DELETE'
);

-- ADMIN: asegurar que tenga todos los permisos (convención existente)
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'ADMIN' AND p.codigo IN (
    'ESTADOS_RASTREO_READ', 'ESTADOS_RASTREO_CREATE', 'ESTADOS_RASTREO_UPDATE', 'ESTADOS_RASTREO_DELETE'
)
AND NOT EXISTS (
    SELECT 1 FROM rol_permiso rp WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
);
