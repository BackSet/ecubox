-- Permisos para administración de manifiestos
INSERT INTO permiso (codigo, descripcion) VALUES
    ('MANIFIESTOS_READ', 'Ver listado y detalle de manifiestos'),
    ('MANIFIESTOS_WRITE', 'Crear, editar, eliminar manifiestos y asignar despachos');

-- Asignar a ADMIN
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'ADMIN' AND p.codigo IN ('MANIFIESTOS_READ', 'MANIFIESTOS_WRITE');
