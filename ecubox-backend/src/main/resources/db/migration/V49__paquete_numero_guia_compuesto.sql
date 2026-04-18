-- Recompone paquete.numero_guia como `<tracking_base> N/M` (formato compuesto
-- visible al usuario) y restablece las constraints de integridad relajadas
-- temporalmente en V47.

-- 1) Recomponer numero_guia desde la guía master + número de pieza.
UPDATE paquete p
SET numero_guia = gm.tracking_base || ' ' || p.pieza_numero || '/' || p.pieza_total
FROM guia_master gm
WHERE p.guia_master_id = gm.id
  AND p.pieza_numero IS NOT NULL
  AND p.pieza_total IS NOT NULL;

-- 2) Restablecer NOT NULL y constraints de integridad de pieza.
ALTER TABLE paquete ALTER COLUMN guia_master_id SET NOT NULL;
ALTER TABLE paquete ALTER COLUMN pieza_numero SET NOT NULL;
ALTER TABLE paquete ALTER COLUMN pieza_total SET NOT NULL;

ALTER TABLE paquete ADD CONSTRAINT chk_paquete_pieza_numero_valida
    CHECK (pieza_numero >= 1 AND pieza_total >= pieza_numero);

CREATE UNIQUE INDEX idx_paquete_guia_master_pieza_uk
    ON paquete(guia_master_id, pieza_numero);

-- 3) numero_guia ya tenía UNIQUE desde V1; lo confirmamos por si acaso.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'paquete' AND indexname = 'paquete_numero_guia_key'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'paquete'::regclass AND contype = 'u'
          AND pg_get_constraintdef(oid) ILIKE '%numero_guia%'
    ) THEN
        ALTER TABLE paquete ADD CONSTRAINT paquete_numero_guia_key UNIQUE (numero_guia);
    END IF;
END $$;

COMMENT ON COLUMN paquete.numero_guia IS
    'Número de guía visible al usuario, autogenerado como `<tracking_base> N/M` desde la guía master';
