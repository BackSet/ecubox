-- Garantiza el permiso del módulo de estadísticas y su acceso operativo.
INSERT INTO permiso (codigo, descripcion)
VALUES (
    'ESTADISTICAS_READ',
    'Ver estadísticas operativas, indicadores y paquetes demorados'
)
ON CONFLICT (codigo) DO UPDATE
SET descripcion = EXCLUDED.descripcion;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
JOIN permiso p ON p.codigo = 'ESTADISTICAS_READ'
WHERE r.nombre IN ('ADMIN', 'OPERARIO')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
