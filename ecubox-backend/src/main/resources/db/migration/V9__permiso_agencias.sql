-- Permisos para administración de agencias (catálogo)
INSERT INTO permiso (codigo, descripcion) VALUES
    ('AGENCIAS_READ', 'Ver listado y detalle de agencias'),
    ('AGENCIAS_WRITE', 'Crear, editar y eliminar agencias');

-- Asignar a ADMIN
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'ADMIN' AND p.codigo IN ('AGENCIAS_READ', 'AGENCIAS_WRITE');
