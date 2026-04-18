-- V60: Eliminacion definitiva de paquete.numero_guia_envio.
--
-- La columna ya esta migrada a la FK paquete.envio_consolidado_id desde V51 y
-- el trigger de V52 mantiene ambos campos sincronizados. Este script:
--   1. Asegura que cualquier paquete con numero_guia_envio sin FK quede
--      enlazado a un envio_consolidado (caso seeds manuales / restores parciales).
--   2. Aborta la migracion si todavia hay huerfanos no recuperables.
--   3. Borra trigger, funcion, indice y columna.
--   4. Refuerza la consistencia pieza/total y la unicidad de pieza por master.

-- 1. Guarda: crear envio_consolidado faltante y enlazar paquetes huerfanos.
INSERT INTO envio_consolidado (
    codigo, estado, fecha_creacion, total_paquetes, version, created_at, updated_at
)
SELECT TRIM(p.numero_guia_envio),
       'ABIERTO',
       CURRENT_TIMESTAMP,
       0,
       0,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
  FROM paquete p
 WHERE p.envio_consolidado_id IS NULL
   AND p.numero_guia_envio IS NOT NULL
   AND TRIM(p.numero_guia_envio) <> ''
   AND NOT EXISTS (
       SELECT 1 FROM envio_consolidado ec
        WHERE UPPER(ec.codigo) = UPPER(TRIM(p.numero_guia_envio))
   )
 GROUP BY TRIM(p.numero_guia_envio);

UPDATE paquete p
   SET envio_consolidado_id = ec.id
  FROM envio_consolidado ec
 WHERE p.envio_consolidado_id IS NULL
   AND p.numero_guia_envio IS NOT NULL
   AND UPPER(TRIM(p.numero_guia_envio)) = UPPER(ec.codigo);

-- 2. Validacion: ningun paquete con codigo debe quedar sin FK resuelta.
DO $$
DECLARE huerfanos INTEGER;
BEGIN
    SELECT COUNT(*) INTO huerfanos
      FROM paquete
     WHERE envio_consolidado_id IS NULL
       AND numero_guia_envio IS NOT NULL
       AND TRIM(numero_guia_envio) <> '';
    IF huerfanos > 0 THEN
        RAISE EXCEPTION
            'Migracion V60 abortada: % paquete(s) con numero_guia_envio sin envio_consolidado_id',
            huerfanos;
    END IF;
END $$;

-- 3. Drop seguro: trigger -> function -> index -> columna.
DROP TRIGGER IF EXISTS trg_sync_paquete_numero_guia_envio ON paquete;
DROP FUNCTION IF EXISTS sync_paquete_numero_guia_envio();
DROP INDEX IF EXISTS idx_paquete_numero_guia_envio;
ALTER TABLE paquete DROP COLUMN IF EXISTS numero_guia_envio;

-- 4. Reforzar invariante numeroGuia <-> guiaMaster/pieza.
ALTER TABLE paquete
    ADD CONSTRAINT chk_paquete_pieza_consistente
    CHECK (
        pieza_numero IS NULL
        OR (
            pieza_total IS NOT NULL
            AND pieza_numero >= 1
            AND pieza_total >= 1
            AND pieza_numero <= pieza_total
        )
    );

CREATE UNIQUE INDEX idx_paquete_master_pieza_uk
    ON paquete (guia_master_id, pieza_numero)
    WHERE guia_master_id IS NOT NULL
      AND pieza_numero IS NOT NULL;

COMMENT ON INDEX idx_paquete_master_pieza_uk IS
    'Garantiza que dentro de una guia master no se repita el numero de pieza';

-- 5. Limpiar tabla auxiliar usada por V45/V47 para preservar numero_guia_envio.
DROP TABLE IF EXISTS _bkp_paquete_numero_guia_envio;
