-- Permiso para imprimir/exportar (PDF/Excel) los despachos desde "Mis entregas".
-- Se otorga a CLIENTE y a ACCESO_ENLACE (este último también accede a Mis entregas
-- vía ACCESO_ENLACE_GUIAS_READ y puede ejecutar las mismas acciones que el cliente).
INSERT INTO permiso (codigo, descripcion)
VALUES ('MIS_ENTREGAS_EXPORT',
        'Cliente/enlace: imprimir y exportar (PDF/Excel) sus despachos en Mis entregas')
ON CONFLICT (codigo) DO UPDATE SET descripcion = EXCLUDED.descripcion;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
JOIN permiso p ON p.codigo = 'MIS_ENTREGAS_EXPORT'
WHERE r.nombre IN ('CLIENTE', 'ACCESO_ENLACE')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
