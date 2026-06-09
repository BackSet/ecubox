-- Permisos dedicados para el modulo de cliente "Mis entregas".
-- Se separa de MIS_GUIAS_* para que roles/permisos puedan administrar
-- lectura, confirmacion e impresion/exportacion de despachos propios.
INSERT INTO permiso (codigo, descripcion)
VALUES
    ('MIS_ENTREGAS_READ', 'Cliente: ver sus despachos y piezas en Mis entregas'),
    ('MIS_ENTREGAS_CONFIRM', 'Cliente: confirmar la recepcion de sus piezas en Mis entregas'),
    ('MIS_ENTREGAS_EXPORT', 'Cliente: imprimir y exportar (PDF/Excel) sus despachos en Mis entregas'),
    ('ACCESO_ENLACE_MIS_ENTREGAS_READ', 'Enlace de acceso: ver despachos asociados a los consignatarios del token'),
    ('ACCESO_ENLACE_MIS_ENTREGAS_EXPORT', 'Enlace de acceso: imprimir y exportar despachos asociados al token')
ON CONFLICT (codigo) DO UPDATE
SET descripcion = EXCLUDED.descripcion;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
JOIN permiso p ON p.codigo IN (
    'MIS_ENTREGAS_READ',
    'MIS_ENTREGAS_CONFIRM',
    'MIS_ENTREGAS_EXPORT'
)
WHERE r.nombre = 'CLIENTE'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
JOIN permiso p ON p.codigo IN (
    'MIS_ENTREGAS_READ',
    'MIS_ENTREGAS_EXPORT',
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
