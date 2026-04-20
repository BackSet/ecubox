-- =====================================================================
-- V73: Renombra todo el residuo "distribuidor" -> "courier_entrega"
-- en el sub-dominio agencia_distribuidor.
--
-- Alcance:
--   * Tablas:    agencia_distribuidor          -> agencia_courier_entrega
--                agencia_distribuidor_version  -> agencia_courier_entrega_version
--   * Columnas:  agencia_courier_entrega_version.agencia_distribuidor_id
--                                              -> agencia_courier_entrega_id
--                despacho.agencia_distribuidor_id
--                                              -> agencia_courier_entrega_id
--                despacho.agencia_distribuidor_version_id
--                                              -> agencia_courier_entrega_version_id
--   * Indices:   idx_agencia_distribuidor_*    -> idx_agencia_courier_entrega_*
--                uq_agencia_distribuidor_*     -> uq_agencia_courier_entrega_*
--                idx_adv_*                     -> idx_ace_*
--                uq_adv_*                      -> uq_ace_*
--                idx_despacho_agencia_distribuidor_*
--                                              -> idx_despacho_agencia_courier_entrega_*
--   * Enum tipo_entrega valor 'AGENCIA_DISTRIBUIDOR' -> 'AGENCIA_COURIER_ENTREGA'
--     (UPDATE de filas + DROP/ADD del CHECK chk_despacho_tipo_entrega)
--   * codigo_secuencia.entity 'AGENCIA_DISTRIBUIDOR' -> 'AGENCIA_COURIER_ENTREGA'
--
-- Las URLs publicas (/api/puntos-entrega) y los permisos PUNTOS_ENTREGA_*
-- ya quedaron canonicos en V72 y NO se tocan aqui.
--
-- Idempotente: cada paso comprueba existencia antes de actuar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Renombrar columnas FK en despacho (deben renombrarse antes que la
--    tabla referenciada para que el nombre PostgreSQL las trate como
--    una mera renombrada de columna; PostgreSQL preserva la FK)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'despacho' AND column_name = 'agencia_distribuidor_id') THEN
    ALTER TABLE despacho RENAME COLUMN agencia_distribuidor_id TO agencia_courier_entrega_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'despacho' AND column_name = 'agencia_distribuidor_version_id') THEN
    ALTER TABLE despacho RENAME COLUMN agencia_distribuidor_version_id TO agencia_courier_entrega_version_id;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2) Renombrar columna FK en agencia_distribuidor_version
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'agencia_distribuidor_version' AND column_name = 'agencia_distribuidor_id') THEN
    ALTER TABLE agencia_distribuidor_version RENAME COLUMN agencia_distribuidor_id TO agencia_courier_entrega_id;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3) Renombrar tablas
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_name = 'agencia_distribuidor_version') THEN
    ALTER TABLE agencia_distribuidor_version RENAME TO agencia_courier_entrega_version;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_name = 'agencia_distribuidor') THEN
    ALTER TABLE agencia_distribuidor RENAME TO agencia_courier_entrega;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 4) Renombrar secuencias asociadas (BIGSERIAL crea <tabla>_id_seq)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'agencia_distribuidor_id_seq' AND relkind = 'S') THEN
    ALTER SEQUENCE agencia_distribuidor_id_seq RENAME TO agencia_courier_entrega_id_seq;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'agencia_distribuidor_version_id_seq' AND relkind = 'S') THEN
    ALTER SEQUENCE agencia_distribuidor_version_id_seq RENAME TO agencia_courier_entrega_version_id_seq;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5) Renombrar indices
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_agencia_distribuidor_distribuidor_id' AND relkind = 'i') THEN
    ALTER INDEX idx_agencia_distribuidor_distribuidor_id RENAME TO idx_agencia_courier_entrega_courier_entrega_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_agencia_distribuidor_courier_entrega_id' AND relkind = 'i') THEN
    ALTER INDEX idx_agencia_distribuidor_courier_entrega_id RENAME TO idx_agencia_courier_entrega_courier_entrega_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_despacho_agencia_distribuidor_id' AND relkind = 'i') THEN
    ALTER INDEX idx_despacho_agencia_distribuidor_id RENAME TO idx_despacho_agencia_courier_entrega_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_despacho_agencia_distribuidor_version' AND relkind = 'i') THEN
    ALTER INDEX idx_despacho_agencia_distribuidor_version RENAME TO idx_despacho_agencia_courier_entrega_version;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_adv_master_actual' AND relkind = 'i') THEN
    ALTER INDEX idx_adv_master_actual RENAME TO idx_ace_master_actual;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_adv_master_id' AND relkind = 'i') THEN
    ALTER INDEX idx_adv_master_id RENAME TO idx_ace_master_id;
  END IF;
END $$;

-- Indice unico parcial creado por V67 y renombrado por V71
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'uq_agencia_distribuidor_courier_entrega_codigo_vivos' AND relkind = 'i') THEN
    ALTER INDEX uq_agencia_distribuidor_courier_entrega_codigo_vivos RENAME TO uq_agencia_courier_entrega_courier_entrega_codigo_vivos;
  END IF;
END $$;

-- Constraint UNIQUE de V67 sobre version
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_adv_master_valid_from') THEN
    ALTER TABLE agencia_courier_entrega_version
        RENAME CONSTRAINT uq_adv_master_valid_from TO uq_ace_master_valid_from;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 6) Enum tipo_entrega: 'AGENCIA_DISTRIBUIDOR' -> 'AGENCIA_COURIER_ENTREGA'
--    a) DROP del CHECK existente
--    b) UPDATE de las filas
--    c) ADD del CHECK con el nuevo literal y nombres de columna nuevos
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_despacho_tipo_entrega') THEN
    ALTER TABLE despacho DROP CONSTRAINT chk_despacho_tipo_entrega;
  END IF;
END $$;

UPDATE despacho
   SET tipo_entrega = 'AGENCIA_COURIER_ENTREGA'
 WHERE tipo_entrega = 'AGENCIA_DISTRIBUIDOR';

ALTER TABLE despacho ADD CONSTRAINT chk_despacho_tipo_entrega CHECK (
    (tipo_entrega = 'DOMICILIO'
        AND consignatario_id IS NOT NULL
        AND agencia_id IS NULL
        AND agencia_courier_entrega_id IS NULL) OR
    (tipo_entrega = 'AGENCIA'
        AND agencia_id IS NOT NULL
        AND consignatario_id IS NULL
        AND agencia_courier_entrega_id IS NULL) OR
    (tipo_entrega = 'AGENCIA_COURIER_ENTREGA'
        AND agencia_courier_entrega_id IS NOT NULL
        AND consignatario_id IS NULL
        AND agencia_id IS NULL)
);

-- Nota: el CHECK chk_despacho_destino_congelado_consistente (V67)
-- referencia las columnas que se renombraron arriba. PostgreSQL actualiza
-- automaticamente esas referencias cuando se hace ALTER TABLE ... RENAME COLUMN,
-- por lo que NO hace falta re-crearlo.

-- ---------------------------------------------------------------------
-- 7) codigo_secuencia.entity: AGENCIA_DISTRIBUIDOR -> AGENCIA_COURIER_ENTREGA
-- ---------------------------------------------------------------------
UPDATE codigo_secuencia
   SET entity = 'AGENCIA_COURIER_ENTREGA'
 WHERE entity = 'AGENCIA_DISTRIBUIDOR';

-- ---------------------------------------------------------------------
-- 8) Comentarios actualizados
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_name = 'agencia_courier_entrega') THEN
    EXECUTE 'COMMENT ON TABLE agencia_courier_entrega IS ''Agencias del courier de entrega; usadas en despacho tipo AGENCIA_COURIER_ENTREGA''';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_name = 'agencia_courier_entrega_version') THEN
    EXECUTE 'COMMENT ON TABLE agencia_courier_entrega_version IS ''Snapshots inmutables de agencia_courier_entrega (SCD Tipo 2). valid_to NULL = version vigente.''';
  END IF;
END $$;
