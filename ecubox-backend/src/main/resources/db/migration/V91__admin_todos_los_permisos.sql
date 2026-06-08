-- El login de ADMIN ya concede todos los permisos de forma efectiva, pero la
-- edición de roles debe reflejarlo físicamente para que el contador coincida.
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
CROSS JOIN permiso p
WHERE r.nombre = 'ADMIN'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
