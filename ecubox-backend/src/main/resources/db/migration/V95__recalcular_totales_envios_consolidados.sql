-- Los totales del consolidado deben reflejar siempre sus paquetes asociados.
-- Esta migracion corrige datos historicos que pudieron quedar con peso/cantidad
-- desactualizados antes de sincronizar estos valores en los flujos de paquetes.

UPDATE envio_consolidado e
SET
    total_paquetes = COALESCE(t.total_paquetes, 0),
    peso_total_lbs = COALESCE(t.peso_total_lbs, 0),
    updated_at = CURRENT_TIMESTAMP
FROM (
    SELECT
        ec.id AS envio_id,
        COUNT(p.id)::INT AS total_paquetes,
        COALESCE(SUM(p.peso_lbs), 0) AS peso_total_lbs
    FROM envio_consolidado ec
    LEFT JOIN paquete p ON p.envio_consolidado_id = ec.id
    GROUP BY ec.id
) t
WHERE e.id = t.envio_id;
