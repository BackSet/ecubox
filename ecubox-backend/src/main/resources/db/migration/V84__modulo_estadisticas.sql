ALTER TABLE paquete ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

UPDATE paquete p
SET created_at = COALESCE(
    (
        SELECT MIN(e.occurred_at)
        FROM paquete_estado_evento e
        WHERE e.paquete_id = p.id
    ),
    p.fecha_estado_actual_desde,
    CURRENT_TIMESTAMP
)
WHERE p.created_at IS NULL;

ALTER TABLE paquete ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE paquete ALTER COLUMN created_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_paquete_created_at ON paquete (created_at);
CREATE INDEX IF NOT EXISTS idx_despacho_fecha_hora ON despacho (fecha_hora);
CREATE INDEX IF NOT EXISTS idx_paquete_pendiente_despacho
    ON paquete (created_at, saca_id);

INSERT INTO parametro_sistema (clave, valor)
VALUES ('estadisticas.dias_max_sin_despachar', '7')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO permiso (codigo, descripcion)
VALUES ('ESTADISTICAS_READ', 'Ver estadísticas operativas y paquetes demorados')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
JOIN permiso p ON p.codigo = 'ESTADISTICAS_READ'
WHERE r.nombre = 'ADMIN'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
