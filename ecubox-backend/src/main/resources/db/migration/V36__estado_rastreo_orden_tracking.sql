ALTER TABLE estado_rastreo
    ADD COLUMN IF NOT EXISTS orden_tracking INTEGER;

WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY orden ASC, id ASC) AS rn
    FROM estado_rastreo
)
UPDATE estado_rastreo e
SET orden_tracking = ranked.rn
FROM ranked
WHERE e.id = ranked.id;

ALTER TABLE estado_rastreo
    ALTER COLUMN orden_tracking SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_estado_rastreo_orden_tracking_activo
    ON estado_rastreo (orden_tracking)
    WHERE activo = TRUE;
