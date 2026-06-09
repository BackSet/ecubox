-- Refuerzo idempotente: los roles cliente y acceso por enlace deben traer
-- por defecto los permisos del modulo "Mis entregas".
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
JOIN permiso p ON p.codigo IN (
    'MIS_ENTREGAS_READ',
    'MIS_ENTREGAS_CONFIRM',
    'MIS_ENTREGAS_EXPORT'
)
WHERE r.nombre IN ('CLIENTE', 'ACCESO_ENLACE')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
JOIN permiso p ON p.codigo IN (
    'ACCESO_ENLACE_MIS_ENTREGAS_READ',
    'ACCESO_ENLACE_MIS_ENTREGAS_EXPORT'
)
WHERE r.nombre = 'ACCESO_ENLACE'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
CROSS JOIN permiso p
WHERE r.nombre = 'ADMIN'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
