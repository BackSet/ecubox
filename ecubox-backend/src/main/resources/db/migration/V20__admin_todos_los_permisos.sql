-- Asignar al rol ADMIN todos los permisos existentes que aún no tenga.
-- Mantiene la BD coherente con la convención "ADMIN = todos los permisos".
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
CROSS JOIN permiso p
WHERE r.nombre = 'ADMIN'
AND NOT EXISTS (
    SELECT 1 FROM rol_permiso rp
    WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
);
