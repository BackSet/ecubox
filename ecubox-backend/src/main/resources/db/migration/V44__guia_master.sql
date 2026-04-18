-- Guía del consolidador (guia_master) con sus piezas fraccionadas (paquete)
-- Reemplaza el campo plano paquete.numero_guia_envio por FK paquete.guia_master_id

CREATE TABLE guia_master (
    id BIGSERIAL PRIMARY KEY,
    tracking_base VARCHAR(100) NOT NULL UNIQUE,
    total_piezas_esperadas INT NOT NULL CHECK (total_piezas_esperadas > 0),
    estado_global VARCHAR(40) NOT NULL DEFAULT 'INCOMPLETA',
    observaciones TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_guia_master_estado_global ON guia_master(estado_global);
CREATE INDEX idx_guia_master_tracking_base_upper ON guia_master((UPPER(tracking_base)));

COMMENT ON TABLE guia_master IS 'Guía del consolidador que agrupa piezas fraccionadas (paquetes 1/N, 2/N...)';
COMMENT ON COLUMN guia_master.tracking_base IS 'Número de guía del consolidador (ej. 184718429)';
COMMENT ON COLUMN guia_master.total_piezas_esperadas IS 'Total de piezas que deben llegar para esta guía';
COMMENT ON COLUMN guia_master.estado_global IS 'Estado agregado calculado desde sus piezas';

-- Nuevas columnas en paquete
ALTER TABLE paquete ADD COLUMN guia_master_id BIGINT NULL REFERENCES guia_master(id) ON DELETE RESTRICT;
ALTER TABLE paquete ADD COLUMN pieza_numero INT NULL;
ALTER TABLE paquete ADD COLUMN pieza_total INT NULL;

-- Backfill 1: crear una guia_master por cada numero_guia_envio distinto no nulo
INSERT INTO guia_master (tracking_base, total_piezas_esperadas, estado_global, created_at)
SELECT sub.numero_guia_envio,
       sub.total,
       'INCOMPLETA',
       CURRENT_TIMESTAMP
FROM (
    SELECT TRIM(numero_guia_envio) AS numero_guia_envio, COUNT(*)::int AS total
    FROM paquete
    WHERE numero_guia_envio IS NOT NULL
      AND TRIM(numero_guia_envio) <> ''
    GROUP BY TRIM(numero_guia_envio)
) sub;

-- Backfill 2: asignar guia_master_id y pieza_numero (ROW_NUMBER dentro del grupo)
UPDATE paquete p
SET guia_master_id = gm.id,
    pieza_numero = sub.rn,
    pieza_total = sub.total
FROM (
    SELECT p2.id,
           TRIM(p2.numero_guia_envio) AS tb,
           ROW_NUMBER() OVER (PARTITION BY TRIM(p2.numero_guia_envio) ORDER BY p2.id)::int AS rn,
           COUNT(*) OVER (PARTITION BY TRIM(p2.numero_guia_envio))::int AS total
    FROM paquete p2
    WHERE p2.numero_guia_envio IS NOT NULL
      AND TRIM(p2.numero_guia_envio) <> ''
) sub
JOIN guia_master gm ON gm.tracking_base = sub.tb
WHERE p.id = sub.id;

-- Backfill 3: paquetes sin numero_guia_envio -> una guía individual por paquete (1/1)
INSERT INTO guia_master (tracking_base, total_piezas_esperadas, estado_global, created_at)
SELECT 'AUTO-' || p.id,
       1,
       'INCOMPLETA',
       CURRENT_TIMESTAMP
FROM paquete p
WHERE p.guia_master_id IS NULL;

UPDATE paquete p
SET guia_master_id = gm.id,
    pieza_numero = 1,
    pieza_total = 1
FROM guia_master gm
WHERE p.guia_master_id IS NULL
  AND gm.tracking_base = 'AUTO-' || p.id;

-- Ahora las columnas son NOT NULL y con constraints de integridad
ALTER TABLE paquete ALTER COLUMN guia_master_id SET NOT NULL;
ALTER TABLE paquete ALTER COLUMN pieza_numero SET NOT NULL;
ALTER TABLE paquete ALTER COLUMN pieza_total SET NOT NULL;

ALTER TABLE paquete ADD CONSTRAINT chk_paquete_pieza_numero_valida
    CHECK (pieza_numero >= 1 AND pieza_total >= pieza_numero);

CREATE UNIQUE INDEX idx_paquete_guia_master_pieza_uk
    ON paquete(guia_master_id, pieza_numero);
CREATE INDEX idx_paquete_guia_master_id ON paquete(guia_master_id);

COMMENT ON COLUMN paquete.guia_master_id IS 'FK a guia_master; cada paquete es una pieza de una guía del consolidador';
COMMENT ON COLUMN paquete.pieza_numero IS 'Índice de la pieza dentro de la guía (1..N)';
COMMENT ON COLUMN paquete.pieza_total IS 'Total de piezas de la guía (denormalizado para etiquetas)';
