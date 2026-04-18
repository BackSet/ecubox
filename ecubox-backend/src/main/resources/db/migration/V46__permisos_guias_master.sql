-- Permisos CRUD para guías master (guía del consolidador)
INSERT INTO permiso (codigo, descripcion) VALUES
    ('GUIAS_MASTER_READ', 'Ver guías master (consolidador)'),
    ('GUIAS_MASTER_CREATE', 'Crear guía master (consolidador)'),
    ('GUIAS_MASTER_UPDATE', 'Editar guía master (consolidador)'),
    ('GUIAS_MASTER_DELETE', 'Eliminar guía master (consolidador)');

-- OPERARIO y ADMIN: gestionan guías master
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre IN ('OPERARIO', 'ADMIN')
AND p.codigo IN ('GUIAS_MASTER_READ', 'GUIAS_MASTER_CREATE', 'GUIAS_MASTER_UPDATE', 'GUIAS_MASTER_DELETE');
