-- Forward-only fix: V53 fue modificada despues de aplicarse a la BD local
-- (los INSERT INTO permiso/rol_permiso para envios consolidados se anadieron
-- mas tarde) y flyway.repair() solo refresco el checksum sin re-ejecutar
-- el SQL. Esta migracion garantiza que los permisos existan tanto si V53
-- corrio el INSERT como si no, gracias a ON CONFLICT DO NOTHING.

INSERT INTO permiso (codigo, descripcion) VALUES
    ('ENVIOS_CONSOLIDADOS_READ', 'Ver envios consolidados USA -> Ecuador'),
    ('ENVIOS_CONSOLIDADOS_CREATE', 'Crear envio consolidado'),
    ('ENVIOS_CONSOLIDADOS_UPDATE', 'Editar envio consolidado y transicionar estados'),
    ('ENVIOS_CONSOLIDADOS_DELETE', 'Eliminar envio consolidado')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre IN ('OPERARIO', 'ADMIN')
AND p.codigo IN ('ENVIOS_CONSOLIDADOS_READ', 'ENVIOS_CONSOLIDADOS_CREATE',
                 'ENVIOS_CONSOLIDADOS_UPDATE', 'ENVIOS_CONSOLIDADOS_DELETE')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
