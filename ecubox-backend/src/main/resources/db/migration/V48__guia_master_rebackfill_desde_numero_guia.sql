-- Rebackfill correcto de guia_master:
--   tracking_base se obtiene PARSEANDO paquete.numero_guia (carrier base),
--   no de numero_guia_envio (consolidador) como había hecho V44 erróneamente.
--
-- Patrón soportado para identificar la "base" del carrier dentro de
-- paquete.numero_guia:
--   - Sufijo " N/M"  (ej: "184718429 1/3")
--   - Sufijos "-N-N" repetidos al final (ej: "1Z...-1-1", "1Z...-1-1-2")
-- La regex `(\s\d+/\d+|(-\d+){2,})$` recorta ambos casos.

-- 1) Limpiar el estado actual erróneo creado por V44.
UPDATE paquete
SET guia_master_id = NULL,
    pieza_numero = NULL,
    pieza_total = NULL;

DELETE FROM guia_master;
ALTER SEQUENCE guia_master_id_seq RESTART WITH 1;

-- 2) Insertar una guia_master por cada base parseada distinta.
INSERT INTO guia_master (tracking_base, total_piezas_esperadas, estado_global, created_at)
SELECT sub.base, sub.total, 'INCOMPLETA', CURRENT_TIMESTAMP
FROM (
    SELECT TRIM(regexp_replace(numero_guia, '(\s\d+/\d+|(-\d+){2,})$', '')) AS base,
           COUNT(*)::int AS total
    FROM paquete
    WHERE numero_guia IS NOT NULL
      AND TRIM(numero_guia) <> ''
    GROUP BY TRIM(regexp_replace(numero_guia, '(\s\d+/\d+|(-\d+){2,})$', ''))
) sub
WHERE sub.base IS NOT NULL AND sub.base <> '';

-- 3) Asignar guia_master_id, pieza_numero y pieza_total a cada paquete.
UPDATE paquete p
SET guia_master_id = gm.id,
    pieza_numero = sub.rn,
    pieza_total = sub.total
FROM (
    SELECT p2.id,
           TRIM(regexp_replace(p2.numero_guia, '(\s\d+/\d+|(-\d+){2,})$', '')) AS base,
           ROW_NUMBER() OVER (
               PARTITION BY TRIM(regexp_replace(p2.numero_guia, '(\s\d+/\d+|(-\d+){2,})$', ''))
               ORDER BY p2.id
           )::int AS rn,
           COUNT(*) OVER (
               PARTITION BY TRIM(regexp_replace(p2.numero_guia, '(\s\d+/\d+|(-\d+){2,})$', ''))
           )::int AS total
    FROM paquete p2
    WHERE p2.numero_guia IS NOT NULL
      AND TRIM(p2.numero_guia) <> ''
) sub
JOIN guia_master gm ON gm.tracking_base = sub.base
WHERE p.id = sub.id;

-- 4) Cualquier paquete que aún quedara sin master (numero_guia vacío) recibe
-- una guía individual AUTO- para mantener invariante (1 paquete = 1 pieza).
INSERT INTO guia_master (tracking_base, total_piezas_esperadas, estado_global, created_at)
SELECT 'AUTO-' || p.id, 1, 'INCOMPLETA', CURRENT_TIMESTAMP
FROM paquete p
WHERE p.guia_master_id IS NULL;

UPDATE paquete p
SET guia_master_id = gm.id,
    pieza_numero = 1,
    pieza_total = 1
FROM guia_master gm
WHERE p.guia_master_id IS NULL
  AND gm.tracking_base = 'AUTO-' || p.id;
