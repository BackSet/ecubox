-- Permisos para administración de distribuidores (catálogo)
INSERT INTO permiso (codigo, descripcion) VALUES
    ('DISTRIBUIDORES_READ', 'Ver listado y detalle de distribuidores'),
    ('DISTRIBUIDORES_WRITE', 'Crear, editar y eliminar distribuidores');

-- Asignar a ADMIN
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'ADMIN' AND p.codigo IN ('DISTRIBUIDORES_READ', 'DISTRIBUIDORES_WRITE');
