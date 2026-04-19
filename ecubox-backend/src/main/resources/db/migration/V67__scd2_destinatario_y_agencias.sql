-- =====================================================================
-- V67: Slowly Changing Dimension Tipo 2 para destinatario_final, agencia
--      y agencia_distribuidor.
--
-- Objetivo: garantizar que la direccion (y demas datos del destino)
-- impresa en una guia master / despacho NO cambie cuando el cliente
-- u operario edita el maestro despues de que la guia ya empezo a
-- despacharse.
--
-- Modelo:
--   - Cada maestro mantiene su tabla con los datos vivos y editables.
--   - Una nueva tabla *_version conserva snapshots inmutables.
--   - guia_master y despacho ganan FKs opcionales a la version "congelada".
--   - Mientras la FK sea NULL, las lecturas resuelven al maestro vivo
--     (permite corregir typos antes del primer despacho).
--   - Al congelar (primer despacho de pieza para guia_master, o creacion
--     del despacho para despacho), se setea la FK con la version vigente
--     y a partir de ahi el snapshot es la fuente de verdad.
-- =====================================================================

-- =====================================================================
-- 1) Tablas de versiones
-- =====================================================================

CREATE TABLE destinatario_final_version (
    id                       BIGSERIAL  PRIMARY KEY,
    destinatario_final_id    BIGINT     NOT NULL REFERENCES destinatario_final(id) ON DELETE CASCADE,
    nombre                   VARCHAR(255) NOT NULL,
    telefono                 VARCHAR(50),
    direccion                TEXT,
    provincia                VARCHAR(100),
    canton                   VARCHAR(100),
    codigo                   VARCHAR(50),
    valid_from               TIMESTAMP  NOT NULL,
    valid_to                 TIMESTAMP  NULL,
    created_by_usuario_id    BIGINT     NULL REFERENCES usuario(id) ON DELETE SET NULL,
    CONSTRAINT uq_dfv_master_valid_from UNIQUE (destinatario_final_id, valid_from)
);

-- Indice parcial para resolver O(1) la version vigente.
CREATE INDEX idx_dfv_master_actual
    ON destinatario_final_version (destinatario_final_id)
    WHERE valid_to IS NULL;

CREATE INDEX idx_dfv_master_id
    ON destinatario_final_version (destinatario_final_id);

COMMENT ON TABLE destinatario_final_version IS
    'Snapshots inmutables de destinatario_final (SCD Tipo 2). valid_to NULL = version vigente.';

CREATE TABLE agencia_version (
    id                       BIGSERIAL    PRIMARY KEY,
    agencia_id               BIGINT       NOT NULL REFERENCES agencia(id) ON DELETE CASCADE,
    nombre                   VARCHAR(255) NOT NULL,
    encargado                VARCHAR(255),
    codigo                   VARCHAR(50)  NOT NULL,
    direccion                VARCHAR(255),
    provincia                VARCHAR(100),
    canton                   VARCHAR(100),
    horario_atencion         TEXT,
    dias_max_retiro          INTEGER,
    tarifa_servicio          DECIMAL(19,4) NOT NULL DEFAULT 0,
    valid_from               TIMESTAMP    NOT NULL,
    valid_to                 TIMESTAMP    NULL,
    created_by_usuario_id    BIGINT       NULL REFERENCES usuario(id) ON DELETE SET NULL,
    CONSTRAINT uq_av_master_valid_from UNIQUE (agencia_id, valid_from)
);

CREATE INDEX idx_av_master_actual
    ON agencia_version (agencia_id)
    WHERE valid_to IS NULL;

CREATE INDEX idx_av_master_id
    ON agencia_version (agencia_id);

COMMENT ON TABLE agencia_version IS
    'Snapshots inmutables de agencia (SCD Tipo 2). valid_to NULL = version vigente.';

CREATE TABLE agencia_distribuidor_version (
    id                              BIGSERIAL    PRIMARY KEY,
    agencia_distribuidor_id         BIGINT       NOT NULL REFERENCES agencia_distribuidor(id) ON DELETE CASCADE,
    distribuidor_id                 BIGINT       NOT NULL REFERENCES distribuidor(id) ON DELETE RESTRICT,
    codigo                          VARCHAR(50)  NOT NULL,
    provincia                       VARCHAR(100),
    canton                          VARCHAR(100),
    direccion                       TEXT,
    horario_atencion                TEXT,
    dias_max_retiro                 INTEGER,
    tarifa                          DECIMAL(19,4) NOT NULL DEFAULT 0,
    valid_from                      TIMESTAMP    NOT NULL,
    valid_to                        TIMESTAMP    NULL,
    created_by_usuario_id           BIGINT       NULL REFERENCES usuario(id) ON DELETE SET NULL,
    CONSTRAINT uq_adv_master_valid_from UNIQUE (agencia_distribuidor_id, valid_from)
);

CREATE INDEX idx_adv_master_actual
    ON agencia_distribuidor_version (agencia_distribuidor_id)
    WHERE valid_to IS NULL;

CREATE INDEX idx_adv_master_id
    ON agencia_distribuidor_version (agencia_distribuidor_id);

COMMENT ON TABLE agencia_distribuidor_version IS
    'Snapshots inmutables de agencia_distribuidor (SCD Tipo 2). valid_to NULL = version vigente.';

-- =====================================================================
-- 2) Backfill: una version inicial vigente por cada maestro existente.
--    valid_from se calcula como el menor created_at de las guias/despachos
--    que la referencian (mejor estimacion del momento en que esos datos
--    eran "reales"), con fallback a NOW(). Esto preserva la unicidad
--    (id_master, valid_from).
-- =====================================================================

INSERT INTO destinatario_final_version
    (destinatario_final_id, nombre, telefono, direccion, provincia, canton, codigo, valid_from, valid_to)
SELECT df.id,
       df.nombre,
       df.telefono,
       df.direccion,
       df.provincia,
       df.canton,
       df.codigo,
       COALESCE(
           (SELECT MIN(gm.created_at)
              FROM guia_master gm
             WHERE gm.destinatario_final_id = df.id),
           CURRENT_TIMESTAMP
       ),
       NULL
FROM destinatario_final df;

INSERT INTO agencia_version
    (agencia_id, nombre, encargado, codigo, direccion, provincia, canton, horario_atencion,
     dias_max_retiro, tarifa_servicio, valid_from, valid_to)
SELECT a.id,
       a.nombre,
       a.encargado,
       a.codigo,
       a.direccion,
       a.provincia,
       a.canton,
       a.horario_atencion,
       a.dias_max_retiro,
       a.tarifa_servicio,
       CURRENT_TIMESTAMP,
       NULL
FROM agencia a;

INSERT INTO agencia_distribuidor_version
    (agencia_distribuidor_id, distribuidor_id, codigo, provincia, canton, direccion,
     horario_atencion, dias_max_retiro, tarifa, valid_from, valid_to)
SELECT ad.id,
       ad.distribuidor_id,
       ad.codigo,
       ad.provincia,
       ad.canton,
       ad.direccion,
       ad.horario_atencion,
       ad.dias_max_retiro,
       ad.tarifa,
       CURRENT_TIMESTAMP,
       NULL
FROM agencia_distribuidor ad;

-- =====================================================================
-- 3) Columnas de "congelado" en guia_master y despacho
-- =====================================================================

ALTER TABLE guia_master
    ADD COLUMN destinatario_version_id    BIGINT    NULL REFERENCES destinatario_final_version(id) ON DELETE RESTRICT,
    ADD COLUMN destinatario_congelado_en  TIMESTAMP NULL;

ALTER TABLE despacho
    ADD COLUMN destinatario_version_id          BIGINT    NULL REFERENCES destinatario_final_version(id) ON DELETE RESTRICT,
    ADD COLUMN agencia_version_id               BIGINT    NULL REFERENCES agencia_version(id) ON DELETE RESTRICT,
    ADD COLUMN agencia_distribuidor_version_id  BIGINT    NULL REFERENCES agencia_distribuidor_version(id) ON DELETE RESTRICT,
    ADD COLUMN destino_congelado_en             TIMESTAMP NULL;

-- =====================================================================
-- 4) Backfill de congelado retroactivo
--
--    a) guia_master: congelar las guias en estados terminales o que ya
--       tuvieron primer despacho de pieza (mejor esfuerzo: si el
--       maestro cambio antes de esta migracion, ya perdimos el snapshot
--       original; este es el punto de partida).
--    b) despacho: congelar TODOS los despachos existentes a la version
--       vigente al momento del backfill (es lo mas cercano a "lo que
--       imprimimos cuando salio el despacho").
-- =====================================================================

UPDATE guia_master gm
SET destinatario_version_id = (
        SELECT v.id
          FROM destinatario_final_version v
         WHERE v.destinatario_final_id = gm.destinatario_final_id
           AND v.valid_to IS NULL
         LIMIT 1
    ),
    destinatario_congelado_en = COALESCE(gm.fecha_primera_pieza_despachada, gm.cerrada_en, gm.created_at)
WHERE gm.destinatario_final_id IS NOT NULL
  AND (
       gm.fecha_primera_pieza_despachada IS NOT NULL
       OR gm.estado_global IN ('DESPACHO_COMPLETADO', 'DESPACHO_INCOMPLETO', 'CANCELADA')
  );

UPDATE despacho d
SET destinatario_version_id = (
        SELECT v.id
          FROM destinatario_final_version v
         WHERE v.destinatario_final_id = d.destinatario_final_id
           AND v.valid_to IS NULL
         LIMIT 1
    )
WHERE d.destinatario_final_id IS NOT NULL;

UPDATE despacho d
SET agencia_version_id = (
        SELECT v.id
          FROM agencia_version v
         WHERE v.agencia_id = d.agencia_id
           AND v.valid_to IS NULL
         LIMIT 1
    )
WHERE d.agencia_id IS NOT NULL;

UPDATE despacho d
SET agencia_distribuidor_version_id = (
        SELECT v.id
          FROM agencia_distribuidor_version v
         WHERE v.agencia_distribuidor_id = d.agencia_distribuidor_id
           AND v.valid_to IS NULL
         LIMIT 1
    )
WHERE d.agencia_distribuidor_id IS NOT NULL;

UPDATE despacho d
SET destino_congelado_en = COALESCE(d.fecha_hora, CURRENT_TIMESTAMP)
WHERE d.destinatario_version_id IS NOT NULL
   OR d.agencia_version_id IS NOT NULL
   OR d.agencia_distribuidor_version_id IS NOT NULL;

-- =====================================================================
-- 5) CHECK constraints de consistencia
--    Si hay version_id, debe haber congelado_en (y viceversa). Esto evita
--    estados intermedios donde el snapshot apunta a algo pero no sabemos
--    cuando se congelo, o decimos que esta congelado pero no a que version.
-- =====================================================================

ALTER TABLE guia_master
    ADD CONSTRAINT chk_guia_master_destinatario_congelado_consistente
    CHECK (
        (destinatario_version_id IS NULL  AND destinatario_congelado_en IS NULL)
     OR (destinatario_version_id IS NOT NULL AND destinatario_congelado_en IS NOT NULL)
    );

ALTER TABLE despacho
    ADD CONSTRAINT chk_despacho_destino_congelado_consistente
    CHECK (
        (destino_congelado_en IS NULL
            AND destinatario_version_id IS NULL
            AND agencia_version_id IS NULL
            AND agencia_distribuidor_version_id IS NULL)
     OR (destino_congelado_en IS NOT NULL
            AND (destinatario_version_id IS NOT NULL
              OR agencia_version_id IS NOT NULL
              OR agencia_distribuidor_version_id IS NOT NULL))
    );

-- =====================================================================
-- 6) Indices auxiliares para resolver lecturas por version_id rapido
-- =====================================================================

CREATE INDEX idx_guia_master_destinatario_version
    ON guia_master (destinatario_version_id)
    WHERE destinatario_version_id IS NOT NULL;

CREATE INDEX idx_despacho_destinatario_version
    ON despacho (destinatario_version_id)
    WHERE destinatario_version_id IS NOT NULL;

CREATE INDEX idx_despacho_agencia_version
    ON despacho (agencia_version_id)
    WHERE agencia_version_id IS NOT NULL;

CREATE INDEX idx_despacho_agencia_distribuidor_version
    ON despacho (agencia_distribuidor_version_id)
    WHERE agencia_distribuidor_version_id IS NOT NULL;

-- =====================================================================
-- 7) Soft-delete en los maestros
--
--    Tras esta migracion, las versiones referencian a los maestros via
--    FK ON DELETE CASCADE. Si hicieramos hard-delete del maestro
--    perderiamos los snapshots y rompemos la integridad de las guias y
--    despachos congelados (que apuntan a los snapshots).
--
--    En vez de cascada, marcamos los maestros como "deleted_at" y los
--    excluimos de los listados vivos. Las guias y despachos viejos
--    siguen siendo legibles porque resuelven via su snapshot.
-- =====================================================================

ALTER TABLE destinatario_final
    ADD COLUMN deleted_at TIMESTAMP NULL;

ALTER TABLE agencia
    ADD COLUMN deleted_at TIMESTAMP NULL;

ALTER TABLE agencia_distribuidor
    ADD COLUMN deleted_at TIMESTAMP NULL;

CREATE INDEX idx_destinatario_final_activos
    ON destinatario_final (id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_agencia_activas
    ON agencia (id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_agencia_distribuidor_activas
    ON agencia_distribuidor (id)
    WHERE deleted_at IS NULL;

COMMENT ON COLUMN destinatario_final.deleted_at      IS 'Soft-delete: si es NOT NULL, el destinatario esta dado de baja y no aparece en listados vivos.';
COMMENT ON COLUMN agencia.deleted_at                 IS 'Soft-delete: si es NOT NULL, la agencia esta dada de baja y no aparece en listados vivos.';
COMMENT ON COLUMN agencia_distribuidor.deleted_at    IS 'Soft-delete: si es NOT NULL, la agencia de distribuidor esta dada de baja.';

-- ---------------------------------------------------------------------
-- 7.1) Unicidad de "codigo" solo entre filas vivas
--
--      La constraint UNIQUE original (V6) bloquea reusar el mismo
--      codigo despues de una baja logica. La reemplazamos por un
--      indice unico parcial que solo aplica a filas con
--      deleted_at IS NULL, asi el operario puede dar de alta un
--      nuevo registro con el mismo codigo si reabre una sucursal,
--      etc., sin chocar con las filas historicas dadas de baja.
-- ---------------------------------------------------------------------

ALTER TABLE agencia DROP CONSTRAINT IF EXISTS agencia_codigo_key;
CREATE UNIQUE INDEX uq_agencia_codigo_vivos
    ON agencia (codigo)
    WHERE deleted_at IS NULL;

-- destinatario_final.codigo es nullable y la unicidad se aplicaba a
-- nivel servicio (existsByCodigo). Aqui solo agregamos un indice
-- parcial defensivo para que, si en el futuro el equipo activa un
-- UNIQUE, ya este alineado con el modelo soft-delete.
CREATE UNIQUE INDEX uq_destinatario_final_codigo_vivos
    ON destinatario_final (codigo)
    WHERE codigo IS NOT NULL AND deleted_at IS NULL;

-- agencia_distribuidor: el UNIQUE compuesto (distribuidor_id, codigo)
-- de V26 lo reemplazamos por un indice parcial equivalente.
ALTER TABLE agencia_distribuidor
    DROP CONSTRAINT IF EXISTS uq_agencia_distribuidor_distribuidor_codigo;
CREATE UNIQUE INDEX uq_agencia_distribuidor_distribuidor_codigo_vivos
    ON agencia_distribuidor (distribuidor_id, codigo)
    WHERE deleted_at IS NULL;

-- =====================================================================
-- 8) Comentarios documentando los nuevos campos
-- =====================================================================

COMMENT ON COLUMN guia_master.destinatario_version_id      IS 'FK a destinatario_final_version: snapshot inmutable congelado al primer despacho de pieza. NULL = lee del maestro vivo.';
COMMENT ON COLUMN guia_master.destinatario_congelado_en    IS 'Momento en que la guia congelo los datos del destinatario.';
COMMENT ON COLUMN despacho.destinatario_version_id         IS 'Snapshot inmutable del destinatario al momento de crear el despacho. NULL si tipo_entrega no es DOMICILIO.';
COMMENT ON COLUMN despacho.agencia_version_id              IS 'Snapshot inmutable de la agencia al momento de crear el despacho. NULL si tipo_entrega no es AGENCIA.';
COMMENT ON COLUMN despacho.agencia_distribuidor_version_id IS 'Snapshot inmutable de la agencia de distribuidor al momento de crear el despacho. NULL si tipo_entrega no es AGENCIA_DISTRIBUIDOR.';
COMMENT ON COLUMN despacho.destino_congelado_en            IS 'Momento en que el despacho congelo los datos del destino.';
