-- Agrega FK paquete.envio_consolidado_id apuntando a envio_consolidado(id)
-- y backfillea desde la columna denormalizada paquete.numero_guia_envio.
-- La columna numero_guia_envio se conserva como denormalizada (sincronizada
-- por trigger en V52) para compatibilidad mientras se migran consumidores.

ALTER TABLE paquete
    ADD COLUMN envio_consolidado_id BIGINT NULL
        REFERENCES envio_consolidado(id) ON DELETE SET NULL;

CREATE INDEX idx_paquete_envio_consolidado_id ON paquete(envio_consolidado_id);

COMMENT ON COLUMN paquete.envio_consolidado_id IS
    'FK al envio consolidado USA -> Ecuador (oficina USA agrupa N paquetes)';

-- 1) Crear un envio_consolidado por cada codigo distinto que ya existe en paquete.
--    Lo dejamos en estado RECIBIDO porque historicamente todos esos codigos ya
--    correspondieron a envios que llegaron al sistema.
INSERT INTO envio_consolidado (codigo, estado, fecha_creacion, fecha_recibido_ec, total_paquetes, peso_total_lbs, created_at, updated_at)
SELECT sub.codigo,
       'RECIBIDO',
       sub.fecha_min,
       sub.fecha_min,
       sub.total,
       sub.peso_total,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM (
    SELECT TRIM(numero_guia_envio) AS codigo,
           MIN(COALESCE(fecha_estado_actual_desde, CURRENT_TIMESTAMP)) AS fecha_min,
           COUNT(*)::int AS total,
           SUM(COALESCE(peso_lbs, 0)) AS peso_total
    FROM paquete
    WHERE numero_guia_envio IS NOT NULL
      AND TRIM(numero_guia_envio) <> ''
    GROUP BY TRIM(numero_guia_envio)
) sub;

-- 2) Enlazar paquetes a su envio_consolidado por codigo (case-insensitive seguro
--    porque los valores se reinsertan tal cual estaban en paquete).
UPDATE paquete p
SET envio_consolidado_id = ec.id
FROM envio_consolidado ec
WHERE p.numero_guia_envio IS NOT NULL
  AND TRIM(p.numero_guia_envio) <> ''
  AND TRIM(p.numero_guia_envio) = ec.codigo;
