-- Asocia cada guía master con un destinatario final y, opcionalmente, con
-- el usuario cliente que la registró. Hace `total_piezas_esperadas` opcional
-- para que el cliente pueda registrar la guía sin conocer el total y el
-- operario lo complete después.

ALTER TABLE guia_master
    ADD COLUMN IF NOT EXISTS destinatario_final_id BIGINT REFERENCES destinatario_final(id),
    ADD COLUMN IF NOT EXISTS cliente_usuario_id   BIGINT REFERENCES usuario(id);

ALTER TABLE guia_master
    ALTER COLUMN total_piezas_esperadas DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guia_master_cliente
    ON guia_master(cliente_usuario_id);

CREATE INDEX IF NOT EXISTS idx_guia_master_destinatario
    ON guia_master(destinatario_final_id);

-- Permisos para que el rol CLIENTE pueda registrar y ver SOLO sus propias guías.
INSERT INTO permiso (codigo, descripcion) VALUES
    ('MIS_GUIAS_READ',   'Cliente: ver sus guías registradas'),
    ('MIS_GUIAS_CREATE', 'Cliente: registrar una guía con destinatario propio')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'CLIENTE'
AND p.codigo IN ('MIS_GUIAS_READ', 'MIS_GUIAS_CREATE')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
