-- =====================================================================
-- V68: Tabla generica codigo_secuencia para generacion atomica de
--      refs y codigos auto-generados.
--
-- Reemplaza los patrones inseguros (count + 1, random + reintento,
-- System.currentTimeMillis()) por una tabla con UPSERT atomico que
-- serializa los conflictos por (entity, scope_key) y nunca asigna el
-- mismo numero a dos requests concurrentes.
--
-- Entidades cubiertas:
--   PAQUETE_REF             scope = destinatario_final_id
--   AGENCIA_DISTRIBUIDOR    scope = distribuidor_id
--   DESTINATARIO_FINAL      scope = "GLOBAL"
--   MANIFIESTO              scope = yyyyMMdd
--   GUIA_MASTER_AUTO        scope = "GLOBAL"
--
-- El backfill siembra cada secuencia con MAX(numero_existente) por
-- scope, asi los numeros nuevos arrancan despues de cualquier valor
-- ya presente y no colisionan con datos historicos.
-- =====================================================================

CREATE TABLE codigo_secuencia (
    entity     VARCHAR(80)  NOT NULL,
    scope_key  VARCHAR(160) NOT NULL,
    next_value BIGINT       NOT NULL,
    updated_at TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT pk_codigo_secuencia PRIMARY KEY (entity, scope_key)
);

COMMENT ON TABLE codigo_secuencia IS
    'Secuencias atomicas para generar refs/codigos por (entity, scope). UPSERT con ON CONFLICT garantiza unicidad bajo concurrencia.';

-- =====================================================================
-- Backfill PAQUETE_REF: extrae el sufijo numerico final del ref actual
-- (formato <codigoBase>-<n>) y siembra MAX(n) por destinatario.
-- =====================================================================
INSERT INTO codigo_secuencia (entity, scope_key, next_value)
SELECT 'PAQUETE_REF',
       destinatario_final_id::text,
       MAX(COALESCE(NULLIF(SUBSTRING(ref FROM '-([0-9]+)$'), '')::bigint, 0))
FROM paquete
WHERE destinatario_final_id IS NOT NULL
GROUP BY destinatario_final_id
HAVING MAX(COALESCE(NULLIF(SUBSTRING(ref FROM '-([0-9]+)$'), '')::bigint, 0)) > 0;

-- =====================================================================
-- Backfill AGENCIA_DISTRIBUIDOR: extrae el numero final del codigo
-- (formato <distribuidorId>-AD-<NNN>) y siembra MAX(n) por distribuidor.
-- =====================================================================
INSERT INTO codigo_secuencia (entity, scope_key, next_value)
SELECT 'AGENCIA_DISTRIBUIDOR',
       distribuidor_id::text,
       MAX(COALESCE(NULLIF(SUBSTRING(codigo FROM '([0-9]+)$'), '')::bigint, 0))
FROM agencia_distribuidor
WHERE distribuidor_id IS NOT NULL
GROUP BY distribuidor_id
HAVING MAX(COALESCE(NULLIF(SUBSTRING(codigo FROM '([0-9]+)$'), '')::bigint, 0)) > 0;

-- =====================================================================
-- Backfill DESTINATARIO_FINAL: los codigos historicos son aleatorios
-- (ECU-XXXX), no secuenciales. Para evitar colisiones con cualquier
-- combinacion ya emitida, sembramos en 10000 (mas alto que el espacio
-- random de 4 digitos). Los nuevos codigos seran ECU-10001, ECU-10002...
-- =====================================================================
INSERT INTO codigo_secuencia (entity, scope_key, next_value)
VALUES ('DESTINATARIO_FINAL', 'GLOBAL', 10000);

-- =====================================================================
-- Backfill MANIFIESTO: scope por dia (yyyyMMdd). Extrae el sufijo final
-- del codigo (formato MAN-yyyyMMdd-NNNN) y siembra por dia.
-- =====================================================================
INSERT INTO codigo_secuencia (entity, scope_key, next_value)
SELECT 'MANIFIESTO',
       SUBSTRING(codigo FROM 'MAN-([0-9]{8})'),
       MAX(COALESCE(NULLIF(SUBSTRING(codigo FROM '-([0-9]+)$'), '')::bigint, 0))
FROM manifiesto
WHERE codigo ~ '^MAN-[0-9]{8}-[0-9]+$'
GROUP BY SUBSTRING(codigo FROM 'MAN-([0-9]{8})')
HAVING MAX(COALESCE(NULLIF(SUBSTRING(codigo FROM '-([0-9]+)$'), '')::bigint, 0)) > 0;

-- =====================================================================
-- Backfill GUIA_MASTER_AUTO: tracking_base auto antiguo usaba
-- "AUTO-<refOrTimestamp>". El nuevo formato sera "AUTO-<NNNNNNNN>".
-- Sembramos en MAX(id_guia_master) para que los proximos AUTO-<n>
-- queden por encima de cualquier numero accidental que ya exista.
-- =====================================================================
INSERT INTO codigo_secuencia (entity, scope_key, next_value)
SELECT 'GUIA_MASTER_AUTO', 'GLOBAL', COALESCE(MAX(id), 0)
FROM guia_master;
