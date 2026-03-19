-- Permiso para que operario (y admin) puedan cargar/actualizar pesos de paquetes
INSERT INTO permiso (codigo, descripcion) VALUES
    ('PAQUETES_PESO_WRITE', 'Cargar y actualizar pesos de paquetes');

-- Asignar a OPERARIO
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'OPERARIO' AND p.codigo = 'PAQUETES_PESO_WRITE';

-- Asignar a ADMIN (mantener todos los permisos)
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'ADMIN' AND p.codigo = 'PAQUETES_PESO_WRITE';
