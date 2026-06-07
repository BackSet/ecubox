-- Permiso dedicado para configurar el tema de temporada (días festivos) del sitio público.
INSERT INTO permiso (codigo, descripcion)
VALUES (
    'TEMA_TEMPORADA_WRITE',
    'Configurar el tema de temporada del sitio público (días festivos y ventanas)'
)
ON CONFLICT (codigo) DO UPDATE
SET descripcion = EXCLUDED.descripcion;

-- Asignar a ADMIN y OPERARIO (gestionan los parámetros del sistema).
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
JOIN permiso p ON p.codigo = 'TEMA_TEMPORADA_WRITE'
WHERE r.nombre IN ('ADMIN', 'OPERARIO')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
