-- Eliminar campo plano numero_guia_envio del paquete tras migrar a guia_master.
-- IMPORTANTE: antes del DROP, respaldamos el valor en una tabla auxiliar para
-- que V47 lo restaure y V51 pueda backfillear envio_consolidado correctamente.
-- La tabla _bkp_paquete_numero_guia_envio se elimina al final en V60.

CREATE TABLE IF NOT EXISTS _bkp_paquete_numero_guia_envio (
    paquete_id        BIGINT PRIMARY KEY,
    numero_guia_envio VARCHAR(100) NOT NULL
);

INSERT INTO _bkp_paquete_numero_guia_envio (paquete_id, numero_guia_envio)
SELECT id, TRIM(numero_guia_envio)
FROM paquete
WHERE numero_guia_envio IS NOT NULL
  AND TRIM(numero_guia_envio) <> ''
ON CONFLICT (paquete_id) DO NOTHING;

DROP INDEX IF EXISTS idx_paquete_numero_guia_envio;
ALTER TABLE paquete DROP COLUMN IF EXISTS numero_guia_envio;
