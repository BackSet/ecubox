-- Roles Operario y Cliente (Admin ya existe; USER se mantiene)
INSERT INTO rol (nombre) VALUES ('OPERARIO'), ('CLIENTE');

-- OPERARIO: permisos de lectura (mismo que USER o subconjunto)
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'OPERARIO' AND p.codigo IN ('USUARIOS_READ', 'ROLES_READ', 'PERMISOS_READ');

-- CLIENTE: sin permisos de administración (área cliente futura)
-- No insertamos permisos para CLIENTE por ahora

COMMENT ON TABLE rol IS 'Roles de usuario: ADMIN, USER, OPERARIO, CLIENTE';
