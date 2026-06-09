-- V107: Actualización de estados de Guía master y Envío consolidado.
--
-- 1. guia_master: renombra estados legacy y añade nuevos estados del flujo v2
--    (PENDIENTE_VERIFICACION, VERIFICADA, CON_PAQUETES_REGISTRADOS,
--    ENVIO_PARCIAL, ENVIO_COMPLETO). Elimina DESPACHO_INCOMPLETO.
-- 2. envio_consolidado: persiste estado_operativo como columna real;
--    añade fecha_cierre y fecha_arribo_ecuador.
-- 3. Actualiza constraints de historial y parametro_sistema.

-- ============================================================
-- SECCION 1: guia_master — migrar estados
-- ============================================================

ALTER TABLE guia_master DROP CONSTRAINT IF EXISTS chk_guia_master_estado_global;
ALTER TABLE guia_master DROP CONSTRAINT IF EXISTS chk_guia_master_estado_requiere_total;
DROP INDEX IF EXISTS idx_guia_master_estado_activo;

-- 1a. Renombres directos sin ambigüedad semántica.
UPDATE guia_master
SET estado_global = CASE
    WHEN estado_global = 'SIN_PIEZAS_REGISTRADAS' THEN 'SIN_PAQUETES_REGISTRADOS'
    WHEN estado_global = 'DESPACHO_INCOMPLETO'     THEN 'DESPACHO_PARCIAL'
    ELSE estado_global
END
WHERE estado_global IN ('SIN_PIEZAS_REGISTRADAS', 'DESPACHO_INCOMPLETO');

-- 1b. Recalcular EN_ESPERA_RECEPCION y EN_TRANSITO_USA_ECUADOR según si
--     los paquetes tienen un envío consolidado asignado.
CREATE TEMP TABLE tmp_gm_v107 ON COMMIT DROP AS
WITH stats AS (
    SELECT
        gm.id,
        gm.estado_global                                                   AS estado_anterior,
        gm.total_piezas_esperadas,
        COUNT(p.id)                                                        AS registradas,
        COUNT(p.id) FILTER (WHERE p.envio_consolidado_id IS NOT NULL)      AS en_consolidado
    FROM guia_master gm
    LEFT JOIN paquete p ON p.guia_master_id = gm.id
    WHERE gm.estado_global IN ('EN_ESPERA_RECEPCION', 'EN_TRANSITO_USA_ECUADOR')
    GROUP BY gm.id, gm.estado_global, gm.total_piezas_esperadas
),
derivados AS (
    SELECT
        id,
        estado_anterior,
        CASE
            WHEN registradas = 0
                THEN 'SIN_PAQUETES_REGISTRADOS'
            WHEN en_consolidado = 0
                THEN 'CON_PAQUETES_REGISTRADOS'
            WHEN (
                    total_piezas_esperadas IS NOT NULL
                    AND total_piezas_esperadas >= 1
                    AND registradas >= total_piezas_esperadas
                    AND en_consolidado >= total_piezas_esperadas
                ) OR (
                    total_piezas_esperadas IS NULL
                    AND en_consolidado >= registradas
                )
                THEN 'ENVIO_COMPLETO'
            ELSE 'ENVIO_PARCIAL'
        END AS estado_nuevo
    FROM stats
)
SELECT id, estado_anterior, estado_nuevo FROM derivados;

UPDATE guia_master gm
SET    estado_global = t.estado_nuevo
FROM   tmp_gm_v107 t
WHERE  gm.id = t.id
  AND  gm.estado_global IS DISTINCT FROM t.estado_nuevo;

-- Anticipar la eliminación de constraints del historial que bloquearían
-- el INSERT siguiente (el estado_nuevo ya usa los nuevos nombres v2).
ALTER TABLE guia_master_estado_historial
    DROP CONSTRAINT IF EXISTS chk_gm_estado_hist_estado_nuevo;
ALTER TABLE guia_master_estado_historial
    DROP CONSTRAINT IF EXISTS chk_gm_estado_hist_estado_anterior;
ALTER TABLE guia_master_estado_historial
    DROP CONSTRAINT IF EXISTS chk_gm_estado_hist_tipo_cambio;

INSERT INTO guia_master_estado_historial
    (guia_master_id, estado_anterior, estado_nuevo, tipo_cambio, motivo, cambiado_en)
SELECT
    id,
    estado_anterior,
    estado_nuevo,
    'RECALCULO_AUTOMATICO',
    'Migracion V107: recalculo de estados EN_ESPERA_RECEPCION / EN_TRANSITO_USA_ECUADOR',
    NOW()
FROM tmp_gm_v107
WHERE estado_anterior IS DISTINCT FROM estado_nuevo;

-- 1c. Actualizar constraint tipo_cambio del historial para incluir nuevos orígenes.
ALTER TABLE guia_master_estado_historial
    DROP CONSTRAINT IF EXISTS chk_gm_estado_hist_tipo_cambio;
ALTER TABLE guia_master_estado_historial
    ADD CONSTRAINT chk_gm_estado_hist_tipo_cambio
    CHECK (tipo_cambio IN (
        'CREACION',
        'RECALCULO_AUTOMATICO',
        'CIERRE_MANUAL_FALTANTE',
        'AUTO_CIERRE_TIMEOUT',
        'CANCELACION',
        'MARCAR_REVISION',
        'SALIR_REVISION',
        'REAPERTURA',
        'APROBACION',
        'MARCAR_PENDIENTE_VERIFICACION'
    ));

-- 1d. Ampliar constraint estado_anterior para incluir valores legacy que
--     permanecen en el historial pero ya no son válidos en guia_master.
ALTER TABLE guia_master_estado_historial
    DROP CONSTRAINT IF EXISTS chk_gm_estado_hist_estado_anterior;
ALTER TABLE guia_master_estado_historial
    ADD CONSTRAINT chk_gm_estado_hist_estado_anterior
    CHECK (
        estado_anterior IS NULL
        OR estado_anterior IN (
            -- Valores legacy (solo en historial)
            'INCOMPLETA',
            'PARCIAL_RECIBIDA',
            'COMPLETA_RECIBIDA',
            'PARCIAL_DESPACHADA',
            'CERRADA',
            'CERRADA_CON_FALTANTE',
            'SIN_PIEZAS_REGISTRADAS',
            'EN_ESPERA_RECEPCION',
            'EN_TRANSITO_USA_ECUADOR',
            'DESPACHO_INCOMPLETO',
            -- Estados v2 activos
            'SIN_PAQUETES_REGISTRADOS',
            'CON_PAQUETES_REGISTRADOS',
            'PENDIENTE_VERIFICACION',
            'VERIFICADA',
            'ENVIO_PARCIAL',
            'ENVIO_COMPLETO',
            'RECEPCION_PARCIAL',
            'RECEPCION_COMPLETA',
            'DESPACHO_PARCIAL',
            'DESPACHO_COMPLETADO',
            'CANCELADA',
            'EN_REVISION'
        )
    );

-- 1e. Actualizar constraint estado_nuevo con todos los estados v2 válidos
--     más los valores legacy que pueden existir en el historial previo a V107.
ALTER TABLE guia_master_estado_historial
    DROP CONSTRAINT IF EXISTS chk_gm_estado_hist_estado_nuevo;
ALTER TABLE guia_master_estado_historial
    ADD CONSTRAINT chk_gm_estado_hist_estado_nuevo
    CHECK (estado_nuevo IN (
        -- Valores legacy (solo en historial previo a V107)
        'INCOMPLETA',
        'PARCIAL_RECIBIDA',
        'COMPLETA_RECIBIDA',
        'PARCIAL_DESPACHADA',
        'CERRADA',
        'CERRADA_CON_FALTANTE',
        'SIN_PIEZAS_REGISTRADAS',
        'EN_ESPERA_RECEPCION',
        'EN_TRANSITO_USA_ECUADOR',
        'DESPACHO_INCOMPLETO',
        -- Estados v2 activos
        'SIN_PAQUETES_REGISTRADOS',
        'CON_PAQUETES_REGISTRADOS',
        'PENDIENTE_VERIFICACION',
        'VERIFICADA',
        'ENVIO_PARCIAL',
        'ENVIO_COMPLETO',
        'RECEPCION_PARCIAL',
        'RECEPCION_COMPLETA',
        'DESPACHO_PARCIAL',
        'DESPACHO_COMPLETADO',
        'CANCELADA',
        'EN_REVISION'
    ));

-- 1f. Restaurar constraints y índice en guia_master con estados v2.
ALTER TABLE guia_master
    ADD CONSTRAINT chk_guia_master_estado_global
    CHECK (estado_global IN (
        'SIN_PAQUETES_REGISTRADOS',
        'CON_PAQUETES_REGISTRADOS',
        'PENDIENTE_VERIFICACION',
        'VERIFICADA',
        'ENVIO_PARCIAL',
        'ENVIO_COMPLETO',
        'RECEPCION_PARCIAL',
        'RECEPCION_COMPLETA',
        'DESPACHO_PARCIAL',
        'DESPACHO_COMPLETADO',
        'CANCELADA',
        'EN_REVISION'
    ));

ALTER TABLE guia_master
    ADD CONSTRAINT chk_guia_master_estado_requiere_total
    CHECK (
        total_piezas_esperadas IS NOT NULL
        OR estado_global IN (
            'SIN_PAQUETES_REGISTRADOS',
            'CON_PAQUETES_REGISTRADOS',
            'PENDIENTE_VERIFICACION',
            'VERIFICADA',
            'ENVIO_PARCIAL',
            'ENVIO_COMPLETO',
            'RECEPCION_PARCIAL',
            'RECEPCION_COMPLETA',
            'CANCELADA',
            'EN_REVISION'
        )
    );

CREATE INDEX idx_guia_master_estado_activo
    ON guia_master (estado_global, fecha_primera_pieza_despachada)
    WHERE estado_global IN (
        'SIN_PAQUETES_REGISTRADOS',
        'CON_PAQUETES_REGISTRADOS',
        'PENDIENTE_VERIFICACION',
        'VERIFICADA',
        'ENVIO_PARCIAL',
        'ENVIO_COMPLETO',
        'RECEPCION_PARCIAL',
        'RECEPCION_COMPLETA',
        'DESPACHO_PARCIAL',
        'EN_REVISION'
    );

-- ============================================================
-- SECCION 2: envio_consolidado — persistir estado_operativo
-- ============================================================

-- 2a. Añadir columnas (nullable primero para poder rellenarlas).
ALTER TABLE envio_consolidado
    ADD COLUMN IF NOT EXISTS estado_operativo    VARCHAR(30),
    ADD COLUMN IF NOT EXISTS fecha_cierre        TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS fecha_arribo_ecuador TIMESTAMP WITHOUT TIME ZONE;

-- 2b. Derivar estado_operativo desde campos legacy para registros existentes.
UPDATE envio_consolidado ec
SET estado_operativo = CASE
    WHEN ec.estado_pago = 'PAGADO'
        THEN 'LIQUIDADO'
    WHEN EXISTS (
        SELECT 1
        FROM lote_recepcion_guia lrg
        WHERE LOWER(lrg.numero_guia_envio) = LOWER(ec.codigo)
    )
        THEN 'RECIBIDO_EN_BODEGA'
    WHEN ec.fecha_cerrado IS NOT NULL
        THEN 'ENVIADO_DESDE_USA'
    WHEN ec.total_paquetes > 0
        THEN 'EN_PREPARACION'
    ELSE 'VACIO'
END
WHERE ec.estado_operativo IS NULL;

-- 2c. Aplicar NOT NULL, DEFAULT y CHECK constraint.
ALTER TABLE envio_consolidado
    ALTER COLUMN estado_operativo SET NOT NULL,
    ALTER COLUMN estado_operativo SET DEFAULT 'VACIO';

ALTER TABLE envio_consolidado
    DROP CONSTRAINT IF EXISTS chk_envio_consolidado_estado_operativo;
ALTER TABLE envio_consolidado
    ADD CONSTRAINT chk_envio_consolidado_estado_operativo
    CHECK (estado_operativo IN (
        'VACIO',
        'EN_PREPARACION',
        'CERRADO',
        'ENVIADO_DESDE_USA',
        'ARRIBADO_ECUADOR',
        'RECIBIDO_EN_BODEGA',
        'LIQUIDADO',
        'CANCELADO'
    ));

CREATE INDEX IF NOT EXISTS idx_envio_consolidado_estado_operativo
    ON envio_consolidado (estado_operativo);

-- ============================================================
-- SECCION 3: parametro_sistema — nuevas claves opcionales
-- ============================================================

INSERT INTO parametro_sistema (clave, valor)
VALUES
    ('estado_rastreo_cierre_consolidado', ''),
    ('estado_rastreo_arribo_ecuador',     '')
ON CONFLICT (clave) DO NOTHING;
