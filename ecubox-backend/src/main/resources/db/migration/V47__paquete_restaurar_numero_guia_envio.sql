-- Restaura numero_guia_envio como agrupador del consolidador USA -> Ecuador
-- (asignado en oficina USA antes del envío; puede repetirse entre paquetes).
-- Relaja temporalmente las constraints de pieza/master para permitir el
-- rebackfill correcto en V48 (que parsea numero_guia para reconstruir las
-- guías master desde la base real del carrier).

ALTER TABLE paquete ADD COLUMN numero_guia_envio VARCHAR(100) NULL;
CREATE INDEX idx_paquete_numero_guia_envio ON paquete(numero_guia_envio);
COMMENT ON COLUMN paquete.numero_guia_envio IS
    'Número de guía del envío consolidador (oficina USA -> Ecuador); puede repetirse en varios paquetes';

-- Restaurar el valor desde el backup creado en V45 para preservar el vínculo
-- con el envío consolidado. Si la tabla auxiliar no existe (entornos donde
-- nunca hubo datos en numero_guia_envio), simplemente se omite.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_bkp_paquete_numero_guia_envio'
    ) THEN
        UPDATE paquete p
           SET numero_guia_envio = b.numero_guia_envio
          FROM _bkp_paquete_numero_guia_envio b
         WHERE b.paquete_id = p.id;
    END IF;
END $$;

-- Drop temporal de unicidad y NOT NULL para que V48 pueda recomponer las
-- piezas sin violar constraints durante la transición.
DROP INDEX IF EXISTS idx_paquete_guia_master_pieza_uk;

ALTER TABLE paquete ALTER COLUMN guia_master_id DROP NOT NULL;
ALTER TABLE paquete ALTER COLUMN pieza_numero DROP NOT NULL;
ALTER TABLE paquete ALTER COLUMN pieza_total DROP NOT NULL;
ALTER TABLE paquete DROP CONSTRAINT IF EXISTS chk_paquete_pieza_numero_valida;
