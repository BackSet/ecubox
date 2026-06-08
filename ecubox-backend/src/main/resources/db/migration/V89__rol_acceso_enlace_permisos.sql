-- Rol y permisos propios para sesiones abiertas desde enlaces de acceso.
--
-- Estos permisos no representan a un CLIENTE real. Solo habilitan lectura
-- acotada a los consignatarios asociados al token del enlace.
INSERT INTO rol (nombre)
VALUES ('ACCESO_ENLACE')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO permiso (codigo, descripcion)
VALUES
    (
        'ACCESO_ENLACE_GUIAS_READ',
        'Enlace de acceso: ver guías asociadas a los consignatarios del token'
    ),
    (
        'ACCESO_ENLACE_CONSIGNATARIOS_READ',
        'Enlace de acceso: ver consignatarios asociados al token'
    )
ON CONFLICT (codigo) DO UPDATE
SET descripcion = EXCLUDED.descripcion;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
JOIN permiso p ON p.codigo IN (
    'ACCESO_ENLACE_GUIAS_READ',
    'ACCESO_ENLACE_CONSIGNATARIOS_READ'
)
WHERE r.nombre = 'ACCESO_ENLACE'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Reafirma el permiso operativo para quienes generan/listan/revocan enlaces.
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
JOIN permiso p ON p.codigo = 'ACCESO_ENLACES_MANAGE'
WHERE r.nombre IN ('ADMIN', 'OPERARIO')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
