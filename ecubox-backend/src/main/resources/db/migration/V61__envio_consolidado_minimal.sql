-- Simplifica envio_consolidado al minimo necesario para uso INTERNO del operario.
--
-- Motivacion: el envio consolidado deja de exponerse en el tracking publico y
-- deja de tener maquina de estados con propagacion automatica a paquetes. Solo
-- se conserva como agrupador con un timestamp opcional `fecha_cerrado` que
-- indica si ya esta cerrado historicamente (NULL = abierto, NOT NULL = cerrado).
--
-- Columnas eliminadas:
--   - estado            : se reemplaza por fecha_cerrado IS NULL/NOT NULL.
--   - version           : ya no se requiere lock optimista (sin maquina de estados).
--   - fecha_creacion    : redundante con created_at.
--   - fecha_envio_usa   : pertenecia a la bitacora de transiciones (eliminada).
--   - fecha_arribo_ec   : idem.
--   - fecha_recibido_ec : idem.

-- 1. Drop de constraints/indices que dependan de las columnas a eliminar.
--    Postgres elimina automaticamente los CHECK propios de columnas, pero
--    cualquier indice explicito sobre `estado` debe caer aqui.
DROP INDEX IF EXISTS idx_envio_consolidado_estado;
DROP INDEX IF EXISTS idx_envio_consolidado_estado_fecha;

-- 2. Drop de columnas. Se ejecutan con IF EXISTS para idempotencia.
ALTER TABLE envio_consolidado DROP COLUMN IF EXISTS estado;
ALTER TABLE envio_consolidado DROP COLUMN IF EXISTS version;
ALTER TABLE envio_consolidado DROP COLUMN IF EXISTS fecha_creacion;
ALTER TABLE envio_consolidado DROP COLUMN IF EXISTS fecha_envio_usa;
ALTER TABLE envio_consolidado DROP COLUMN IF EXISTS fecha_arribo_ec;
ALTER TABLE envio_consolidado DROP COLUMN IF EXISTS fecha_recibido_ec;

-- 3. Indice util para listados ordenados por creacion descendente.
CREATE INDEX IF NOT EXISTS idx_envio_consolidado_created_at
    ON envio_consolidado (created_at DESC);

-- 4. Indice parcial para filtrar rapidamente envios abiertos vs cerrados.
CREATE INDEX IF NOT EXISTS idx_envio_consolidado_abiertos
    ON envio_consolidado (id)
    WHERE fecha_cerrado IS NULL;

COMMENT ON COLUMN envio_consolidado.fecha_cerrado IS
    'Marca de cierre del envio. NULL = abierto (admite agregar/quitar paquetes), NOT NULL = cerrado historicamente';
