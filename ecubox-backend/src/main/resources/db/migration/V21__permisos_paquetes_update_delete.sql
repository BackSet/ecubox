-- Permisos para editar y eliminar paquetes (Admin, Operario y Cliente)
INSERT INTO permiso (codigo, descripcion) VALUES
    ('PAQUETES_UPDATE', 'Editar paquete'),
    ('PAQUETES_DELETE', 'Eliminar paquete');

-- CLIENTE, OPERARIO y ADMIN: pueden editar y eliminar (según reglas en servicio)
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre IN ('CLIENTE', 'OPERARIO', 'ADMIN')
AND p.codigo IN ('PAQUETES_UPDATE', 'PAQUETES_DELETE');
