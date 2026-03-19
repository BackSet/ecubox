-- Permisos granulares: destinatarios (mis destinatarios) y paquetes (mis paquetes)
-- Permiten al administrador asignar cada acción a los roles que defina (ej. CLIENTE).

-- Destinatarios: mis destinatarios
INSERT INTO permiso (codigo, descripcion) VALUES
    ('DESTINATARIOS_READ', 'Ver listado y detalle de mis destinatarios'),
    ('DESTINATARIOS_CREATE', 'Crear destinatario'),
    ('DESTINATARIOS_UPDATE', 'Editar mis destinatarios'),
    ('DESTINATARIOS_DELETE', 'Eliminar mis destinatarios'),
    ('DESTINATARIOS_OPERARIO', 'Listar todos los destinatarios y editar código/cualquiera');

-- Paquetes: mis paquetes
INSERT INTO permiso (codigo, descripcion) VALUES
    ('PAQUETES_READ', 'Ver listado de mis paquetes'),
    ('PAQUETES_CREATE', 'Crear paquete');

-- CLIENTE: destinatarios y paquetes propios
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'CLIENTE' AND p.codigo IN (
    'DESTINATARIOS_READ', 'DESTINATARIOS_CREATE', 'DESTINATARIOS_UPDATE', 'DESTINATARIOS_DELETE',
    'PAQUETES_READ', 'PAQUETES_CREATE'
);

-- OPERARIO: listar/editar todos los destinatarios
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'OPERARIO' AND p.codigo = 'DESTINATARIOS_OPERARIO';

-- ADMIN: todos los nuevos permisos
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'ADMIN' AND p.codigo IN (
    'DESTINATARIOS_READ', 'DESTINATARIOS_CREATE', 'DESTINATARIOS_UPDATE', 'DESTINATARIOS_DELETE', 'DESTINATARIOS_OPERARIO',
    'PAQUETES_READ', 'PAQUETES_CREATE'
);
