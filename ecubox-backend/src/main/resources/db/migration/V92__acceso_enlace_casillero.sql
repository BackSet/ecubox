-- El rol de enlace puede ver el módulo de casillero, además de guías y
-- consignatarios acotados al token.
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
JOIN permiso p ON p.codigo = 'CASILLERO_READ'
WHERE r.nombre = 'ACCESO_ENLACE'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
