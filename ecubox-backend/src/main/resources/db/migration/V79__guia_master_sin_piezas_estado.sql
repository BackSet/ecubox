-- Estado inicial SIN_PIEZAS_REGISTRADAS + ajuste de constraints e indice activo.

-- 1) Quitar constraints que enumeran estado_global -----------------------------
ALTER TABLE guia_master DROP CONSTRAINT IF EXISTS chk_guia_master_estado_global;
ALTER TABLE guia_master DROP CONSTRAINT IF EXISTS chk_guia_master_estado_requiere_total;

-- 2) Backfill: guias sin paquetes asociados ------------------------------------
UPDATE guia_master gm
SET estado_global = 'SIN_PIEZAS_REGISTRADAS'
WHERE NOT EXISTS (SELECT 1 FROM paquete p WHERE p.guia_master_id = gm.id);

-- 3) Default para nuevas filas -------------------------------------------------
ALTER TABLE guia_master ALTER COLUMN estado_global SET DEFAULT 'SIN_PIEZAS_REGISTRADAS';

-- 4) CHECK valores permitidos en estado_global --------------------------------
ALTER TABLE guia_master
    ADD CONSTRAINT chk_guia_master_estado_global
    CHECK (estado_global IN (
        'SIN_PIEZAS_REGISTRADAS',
        'EN_ESPERA_RECEPCION',
        'RECEPCION_PARCIAL',
        'RECEPCION_COMPLETA',
        'DESPACHO_PARCIAL',
        'DESPACHO_COMPLETADO',
        'DESPACHO_INCOMPLETO',
        'CANCELADA',
        'EN_REVISION'
    ));

-- 5) total NULL: permitir estados previos a despacho + SIN_PIEZAS + revision/cancel
ALTER TABLE guia_master
    ADD CONSTRAINT chk_guia_master_estado_requiere_total
    CHECK (
        total_piezas_esperadas IS NOT NULL
        OR estado_global IN (
            'SIN_PIEZAS_REGISTRADAS',
            'EN_ESPERA_RECEPCION',
            'RECEPCION_PARCIAL',
            'RECEPCION_COMPLETA',
            'CANCELADA',
            'EN_REVISION'
        )
    );

-- 6) Indice parcial de guias activas -------------------------------------------
DROP INDEX IF EXISTS idx_guia_master_estado_activo;
CREATE INDEX idx_guia_master_estado_activo
    ON guia_master (estado_global, fecha_primera_pieza_despachada)
    WHERE estado_global IN (
        'SIN_PIEZAS_REGISTRADAS',
        'EN_ESPERA_RECEPCION',
        'RECEPCION_PARCIAL',
        'RECEPCION_COMPLETA',
        'DESPACHO_PARCIAL',
        'EN_REVISION'
    );

-- 7) Historial: permitir nuevo estado en anterior y nuevo ----------------------
ALTER TABLE guia_master_estado_historial DROP CONSTRAINT IF EXISTS chk_gm_estado_hist_estado_anterior;
ALTER TABLE guia_master_estado_historial
    ADD CONSTRAINT chk_gm_estado_hist_estado_anterior
    CHECK (
        estado_anterior IS NULL
        OR estado_anterior IN (
            'SIN_PIEZAS_REGISTRADAS',
            'EN_ESPERA_RECEPCION',
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
        'RECEPCION_PARCIAL',
        'RECEPCION_COMPLETA',
        'DESPACHO_PARCIAL',
        'DESPACHO_COMPLETADO',
        'DESPACHO_INCOMPLETO',
        'CANCELADA',
        'EN_REVISION'
    ));
