-- Nuevo estado derivado de guia master cuando sus piezas salieron de USA pero
-- aun no entraron a recepcion en bodega. Tambien normaliza los estados
-- operativos configurables de consolidados (antes solo ABIERTO/CERRADO).

ALTER TABLE guia_master DROP CONSTRAINT IF EXISTS chk_guia_master_estado_global;
ALTER TABLE guia_master DROP CONSTRAINT IF EXISTS chk_guia_master_estado_requiere_total;

-- 1) Normalizar valores historicos que pudieran quedar en ambientes con datos
-- antiguos o cargas manuales previas a V66/V79.
UPDATE guia_master
SET estado_global = CASE estado_global
    WHEN 'INCOMPLETA' THEN 'EN_ESPERA_RECEPCION'
    WHEN 'PARCIAL_RECIBIDA' THEN 'RECEPCION_PARCIAL'
    WHEN 'COMPLETA_RECIBIDA' THEN 'RECEPCION_COMPLETA'
    WHEN 'PARCIAL_DESPACHADA' THEN 'DESPACHO_PARCIAL'
    WHEN 'CERRADA' THEN 'DESPACHO_COMPLETADO'
    WHEN 'CERRADA_CON_FALTANTE' THEN 'DESPACHO_INCOMPLETO'
    ELSE estado_global
END,
    cerrada_en = CASE
        WHEN estado_global IN ('CERRADA', 'CERRADA_CON_FALTANTE') THEN COALESCE(cerrada_en, NOW())
        ELSE cerrada_en
    END,
    tipo_cierre = CASE
        WHEN estado_global = 'CERRADA' THEN COALESCE(tipo_cierre, 'DESPACHO_COMPLETADO')
        WHEN estado_global = 'CERRADA_CON_FALTANTE' THEN COALESCE(tipo_cierre, 'DESPACHO_INCOMPLETO_MANUAL')
        ELSE tipo_cierre
    END,
    motivo_cierre = CASE
        WHEN estado_global = 'CERRADA' THEN COALESCE(motivo_cierre, 'Migracion de estado historico CERRADA')
        WHEN estado_global = 'CERRADA_CON_FALTANTE' THEN COALESCE(motivo_cierre, 'Migracion de estado historico CERRADA_CON_FALTANTE')
        ELSE motivo_cierre
    END
WHERE estado_global IN (
    'INCOMPLETA',
    'PARCIAL_RECIBIDA',
    'COMPLETA_RECIBIDA',
    'PARCIAL_DESPACHADA',
    'CERRADA',
    'CERRADA_CON_FALTANTE'
);

-- 2) Recalcular estados activos para introducir EN_TRANSITO_USA_ECUADOR en
-- guias cuyas piezas ya salieron de USA pero aun no entraron a recepcion.
-- No se tocan estados terminales ni EN_REVISION.
CREATE TEMP TABLE tmp_guia_master_estado_v102 ON COMMIT DROP AS
WITH cfg AS (
    SELECT
        MAX(CASE
            WHEN clave = 'estado_rastreo_enviado_desde_usa' AND valor ~ '^[0-9]+$'
                THEN valor::BIGINT
            ELSE NULL
        END) AS enviado_desde_usa_id,
        MAX(CASE
            WHEN clave = 'estado_rastreo_en_lote_recepcion' AND valor ~ '^[0-9]+$'
                THEN valor::BIGINT
            ELSE NULL
        END) AS en_lote_recepcion_id
    FROM parametro_sistema
    WHERE clave IN ('estado_rastreo_enviado_desde_usa', 'estado_rastreo_en_lote_recepcion')
),
stats AS (
    SELECT
        gm.id,
        gm.estado_global AS estado_anterior,
        gm.total_piezas_esperadas,
        COUNT(p.id) AS registradas,
        COUNT(p.id) FILTER (
            WHERE cfg.en_lote_recepcion_id IS NOT NULL
              AND p.estado_rastreo_id = cfg.en_lote_recepcion_id
        ) AS en_recepcion,
        COUNT(p.id) FILTER (
            WHERE cfg.enviado_desde_usa_id IS NOT NULL
              AND p.estado_rastreo_id = cfg.enviado_desde_usa_id
        ) AS enviadas_desde_usa,
        COUNT(p.id) FILTER (WHERE s.despacho_id IS NOT NULL) AS despachadas
    FROM guia_master gm
    CROSS JOIN cfg
    LEFT JOIN paquete p ON p.guia_master_id = gm.id
    LEFT JOIN saca s ON s.id = p.saca_id
    WHERE gm.estado_global NOT IN (
        'DESPACHO_COMPLETADO',
        'DESPACHO_INCOMPLETO',
        'CANCELADA',
        'EN_REVISION'
    )
    GROUP BY gm.id, gm.estado_global, gm.total_piezas_esperadas
),
derivados AS (
    SELECT
        id,
        estado_anterior,
        CASE
            WHEN registradas = 0 THEN 'SIN_PIEZAS_REGISTRADAS'
            WHEN despachadas > 0 THEN
                CASE
                    WHEN (
                        total_piezas_esperadas IS NOT NULL
                        AND total_piezas_esperadas >= 1
                        AND registradas >= total_piezas_esperadas
                        AND despachadas >= total_piezas_esperadas
                    ) OR (
                        total_piezas_esperadas IS NULL
                        AND despachadas >= registradas
                    )
                    THEN 'DESPACHO_COMPLETADO'
                    ELSE 'DESPACHO_PARCIAL'
                END
            WHEN (
                (
                    total_piezas_esperadas IS NOT NULL
                    AND total_piezas_esperadas >= 1
                    AND registradas >= total_piezas_esperadas
                    AND en_recepcion >= total_piezas_esperadas
                ) OR (
                    total_piezas_esperadas IS NULL
                    AND en_recepcion >= registradas
                )
            ) THEN 'RECEPCION_COMPLETA'
            WHEN en_recepcion > 0 THEN 'RECEPCION_PARCIAL'
            WHEN enviadas_desde_usa > 0 THEN 'EN_TRANSITO_USA_ECUADOR'
            ELSE 'EN_ESPERA_RECEPCION'
        END AS estado_nuevo
    FROM stats
)
SELECT id, estado_anterior, estado_nuevo
FROM derivados
WHERE estado_anterior IS DISTINCT FROM estado_nuevo;

UPDATE guia_master gm
SET estado_global = t.estado_nuevo,
    cerrada_en = CASE
        WHEN t.estado_nuevo = 'DESPACHO_COMPLETADO' THEN COALESCE(gm.cerrada_en, NOW())
        ELSE NULL
    END,
    tipo_cierre = CASE
        WHEN t.estado_nuevo = 'DESPACHO_COMPLETADO' THEN COALESCE(gm.tipo_cierre, 'DESPACHO_COMPLETADO')
        ELSE NULL
    END,
    motivo_cierre = CASE
        WHEN t.estado_nuevo = 'DESPACHO_COMPLETADO' THEN COALESCE(gm.motivo_cierre, 'Todas las piezas fueron despachadas')
        ELSE NULL
    END
FROM tmp_guia_master_estado_v102 t
WHERE gm.id = t.id;

ALTER TABLE guia_master
    ADD CONSTRAINT chk_guia_master_estado_global
    CHECK (estado_global IN (
        'SIN_PIEZAS_REGISTRADAS',
        'EN_ESPERA_RECEPCION',
        'EN_TRANSITO_USA_ECUADOR',
        'RECEPCION_PARCIAL',
        'RECEPCION_COMPLETA',
        'DESPACHO_PARCIAL',
        'DESPACHO_COMPLETADO',
        'DESPACHO_INCOMPLETO',
        'CANCELADA',
        'EN_REVISION'
    ));

ALTER TABLE guia_master
    ADD CONSTRAINT chk_guia_master_estado_requiere_total
    CHECK (
        total_piezas_esperadas IS NOT NULL
        OR estado_global IN (
            'SIN_PIEZAS_REGISTRADAS',
            'EN_ESPERA_RECEPCION',
            'EN_TRANSITO_USA_ECUADOR',
            'RECEPCION_PARCIAL',
            'RECEPCION_COMPLETA',
            'CANCELADA',
            'EN_REVISION'
        )
    );

DROP INDEX IF EXISTS idx_guia_master_estado_activo;
CREATE INDEX idx_guia_master_estado_activo
    ON guia_master (estado_global, fecha_primera_pieza_despachada)
    WHERE estado_global IN (
        'SIN_PIEZAS_REGISTRADAS',
        'EN_ESPERA_RECEPCION',
        'EN_TRANSITO_USA_ECUADOR',
        'RECEPCION_PARCIAL',
        'RECEPCION_COMPLETA',
        'DESPACHO_PARCIAL',
        'EN_REVISION'
    );

ALTER TABLE guia_master_estado_historial DROP CONSTRAINT IF EXISTS chk_gm_estado_hist_estado_anterior;
ALTER TABLE guia_master_estado_historial
    ADD CONSTRAINT chk_gm_estado_hist_estado_anterior
    CHECK (
        estado_anterior IS NULL
        OR estado_anterior IN (
            'SIN_PIEZAS_REGISTRADAS',
            'EN_ESPERA_RECEPCION',
            'EN_TRANSITO_USA_ECUADOR',
            'RECEPCION_PARCIAL',
            'RECEPCION_COMPLETA',
            'DESPACHO_PARCIAL',
            'DESPACHO_COMPLETADO',
            'DESPACHO_INCOMPLETO',
            'CANCELADA',
            'EN_REVISION',
            'INCOMPLETA',
            'PARCIAL_RECIBIDA',
            'COMPLETA_RECIBIDA',
            'PARCIAL_DESPACHADA',
            'CERRADA',
            'CERRADA_CON_FALTANTE'
        )
    );

ALTER TABLE guia_master_estado_historial DROP CONSTRAINT IF EXISTS chk_gm_estado_hist_estado_nuevo;
ALTER TABLE guia_master_estado_historial
    ADD CONSTRAINT chk_gm_estado_hist_estado_nuevo
    CHECK (estado_nuevo IN (
        'SIN_PIEZAS_REGISTRADAS',
        'EN_ESPERA_RECEPCION',
        'EN_TRANSITO_USA_ECUADOR',
        'RECEPCION_PARCIAL',
        'RECEPCION_COMPLETA',
        'DESPACHO_PARCIAL',
        'DESPACHO_COMPLETADO',
        'DESPACHO_INCOMPLETO',
        'CANCELADA',
        'EN_REVISION'
    ));

INSERT INTO guia_master_estado_historial
    (guia_master_id, estado_anterior, estado_nuevo, tipo_cambio, motivo, cambiado_en)
SELECT
    id,
    estado_anterior,
    estado_nuevo,
    'RECALCULO_AUTOMATICO',
    'Migracion V102: normalizacion de estados actuales',
    NOW()
FROM tmp_guia_master_estado_v102;

INSERT INTO parametro_sistema (clave, valor)
VALUES ('estado_guia_master_en_transito_usa_ecuador', 'EN_TRANSITO_USA_ECUADOR')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;

WITH defaults(clave, valor_default) AS (
    VALUES
        ('estado_consolidado_creado', 'VACIO'),
        ('estado_consolidado_agregado_lote', 'RECIBIDO_EN_BODEGA'),
        ('estado_consolidado_cerrado', 'ENVIADO_DESDE_USA'),
        ('estado_consolidado_reabierto', 'EN_PREPARACION')
)
UPDATE parametro_sistema p
SET valor = CASE
    WHEN p.valor IN ('VACIO', 'EN_PREPARACION', 'ENVIADO_DESDE_USA', 'RECIBIDO_EN_BODEGA', 'LIQUIDADO')
        THEN p.valor
    ELSE d.valor_default
END
FROM defaults d
WHERE p.clave = d.clave;
