-- Permiso para que operario (y admin) puedan crear y gestionar despachos
INSERT INTO permiso (codigo, descripcion) VALUES
    ('DESPACHOS_WRITE', 'Crear y gestionar despachos');

-- Asignar a OPERARIO
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'OPERARIO' AND p.codigo = 'DESPACHOS_WRITE';

-- Asignar a ADMIN
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'ADMIN' AND p.codigo = 'DESPACHOS_WRITE';
