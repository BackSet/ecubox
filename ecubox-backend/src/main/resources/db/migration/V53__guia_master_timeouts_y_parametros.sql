-- Agrega timestamps en guia_master para soportar reglas de despacho parcial
-- y job de auto-cierre con faltante por timeout. Inserta parametros del sistema
-- para configurar las reglas y los nuevos estados de tracking del envio
-- consolidado.

ALTER TABLE guia_master ADD COLUMN fecha_primera_recepcion TIMESTAMP NULL;
ALTER TABLE guia_master ADD COLUMN fecha_primera_pieza_despachada TIMESTAMP NULL;

CREATE INDEX idx_guia_master_estado_activo
    ON guia_master (estado_global, fecha_primera_pieza_despachada)
    WHERE estado_global IN ('INCOMPLETA', 'PARCIAL_RECIBIDA', 'COMPLETA_RECIBIDA', 'PARCIAL_DESPACHADA');

COMMENT ON COLUMN guia_master.fecha_primera_recepcion IS
    'Timestamp de la primera pieza recibida (>= estado en lote recepcion); informativo';
COMMENT ON COLUMN guia_master.fecha_primera_pieza_despachada IS
    'Timestamp de la primera pieza despachada; usado por el job de auto-cierre con faltante';

INSERT INTO parametro_sistema (clave, valor) VALUES
    ('guia_master.min_piezas_para_despacho_parcial', '1'),
    ('guia_master.dias_para_auto_cierre_con_faltante', '30'),
    ('guia_master.requiere_confirmacion_despacho_parcial', 'true'),
    ('estado_rastreo_enviado_desde_usa', ''),
    ('estado_rastreo_arribado_ec', '')
ON CONFLICT (clave) DO NOTHING;

COMMENT ON COLUMN parametro_sistema.clave IS
    'Clave del parametro (ej: guia_master.min_piezas_para_despacho_parcial)';

-- Permisos CRUD para envios consolidados USA -> Ecuador
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
