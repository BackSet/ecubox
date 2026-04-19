-- =====================================================================
-- V66: Mejora del modelo de estados de guia_master.
--
-- Cambios:
--   1) Renombre de los valores del estado_global por nombres mas descriptivos
--      orientados al operario (mantienen la misma semantica de negocio).
--   2) Nuevos estados de excepcion: CANCELADA y EN_REVISION.
--   3) CHECK constraint sobre estado_global para garantizar integridad
--      independientemente de la capa de aplicacion.
--   4) Salvaguarda: ninguna guia con total_piezas_esperadas IS NULL puede
--      estar en estados de despacho/cierre.
--   5) Auditoria de cierre en guia_master: cerrada_en, cerrada_por_usuario_id,
--      tipo_cierre, motivo_cierre. Hasta ahora el motivo del cierre con
--      faltante solo se logueaba (V57 elimino observaciones), ahora se
--      persiste para trazabilidad.
--   6) Tabla guia_master_estado_historial: registro inmutable de cada
--      transicion con actor, motivo y tipo de cambio.
--   7) Recreacion del indice parcial de guias activas con los nuevos
--      nombres de estado.
--
-- Mapeo de renombres:
--   INCOMPLETA           -> EN_ESPERA_RECEPCION
--   PARCIAL_RECIBIDA     -> RECEPCION_PARCIAL
--   COMPLETA_RECIBIDA    -> RECEPCION_COMPLETA
--   PARCIAL_DESPACHADA   -> DESPACHO_PARCIAL
--   CERRADA              -> DESPACHO_COMPLETADO
--   CERRADA_CON_FALTANTE -> DESPACHO_INCOMPLETO
-- =====================================================================

-- 1) Renombrar valores existentes en estado_global -----------------------
UPDATE guia_master SET estado_global = 'EN_ESPERA_RECEPCION'  WHERE estado_global = 'INCOMPLETA';
UPDATE guia_master SET estado_global = 'RECEPCION_PARCIAL'    WHERE estado_global = 'PARCIAL_RECIBIDA';
UPDATE guia_master SET estado_global = 'RECEPCION_COMPLETA'   WHERE estado_global = 'COMPLETA_RECIBIDA';
UPDATE guia_master SET estado_global = 'DESPACHO_PARCIAL'     WHERE estado_global = 'PARCIAL_DESPACHADA';
UPDATE guia_master SET estado_global = 'DESPACHO_COMPLETADO'  WHERE estado_global = 'CERRADA';
UPDATE guia_master SET estado_global = 'DESPACHO_INCOMPLETO'  WHERE estado_global = 'CERRADA_CON_FALTANTE';

-- 2) Default de estado_global ahora apunta al nuevo nombre ---------------
ALTER TABLE guia_master ALTER COLUMN estado_global SET DEFAULT 'EN_ESPERA_RECEPCION';

-- 3) CHECK con la lista canonica de valores permitidos -------------------
ALTER TABLE guia_master
    ADD CONSTRAINT chk_guia_master_estado_global
    CHECK (estado_global IN (
        'EN_ESPERA_RECEPCION',
        'RECEPCION_PARCIAL',
        'RECEPCION_COMPLETA',
        'DESPACHO_PARCIAL',
        'DESPACHO_COMPLETADO',
        'DESPACHO_INCOMPLETO',
        'CANCELADA',
        'EN_REVISION'
    ));

-- 4) Salvaguarda: estados de despacho requieren total_piezas_esperadas ---
--    Si total IS NULL, solo puede estar en estados previos al despacho
--    o en estados administrativos (CANCELADA / EN_REVISION).
ALTER TABLE guia_master
    ADD CONSTRAINT chk_guia_master_estado_requiere_total
    CHECK (
        total_piezas_esperadas IS NOT NULL
        OR estado_global IN (
            'EN_ESPERA_RECEPCION',
            'RECEPCION_PARCIAL',
            'RECEPCION_COMPLETA',
            'CANCELADA',
            'EN_REVISION'
        )
    );

-- 5) Auditoria de cierre -------------------------------------------------
ALTER TABLE guia_master ADD COLUMN cerrada_en               TIMESTAMP NULL;
ALTER TABLE guia_master ADD COLUMN cerrada_por_usuario_id   BIGINT    NULL REFERENCES usuario(id) ON DELETE SET NULL;
ALTER TABLE guia_master ADD COLUMN tipo_cierre              VARCHAR(40) NULL;
ALTER TABLE guia_master ADD COLUMN motivo_cierre            TEXT      NULL;

ALTER TABLE guia_master
    ADD CONSTRAINT chk_guia_master_tipo_cierre
    CHECK (
        tipo_cierre IS NULL
        OR tipo_cierre IN (
            'DESPACHO_COMPLETADO',
            'DESPACHO_INCOMPLETO_MANUAL',
            'DESPACHO_INCOMPLETO_TIMEOUT',
            'CANCELACION'
        )
    );

-- Backfill: rellenar cerrada_en/tipo_cierre para guias ya terminales -----
-- IMPORTANTE: este backfill DEBE ejecutarse ANTES de agregar la constraint
-- chk_guia_master_cierre_consistente, porque las guias ya terminales en BD
-- aun no tienen cerrada_en ni tipo_cierre.
UPDATE guia_master
SET cerrada_en  = COALESCE(fecha_primera_pieza_despachada, created_at),
    tipo_cierre = 'DESPACHO_COMPLETADO'
WHERE estado_global = 'DESPACHO_COMPLETADO'
  AND cerrada_en IS NULL;

UPDATE guia_master
SET cerrada_en  = COALESCE(fecha_primera_pieza_despachada, created_at),
    tipo_cierre = 'DESPACHO_INCOMPLETO_MANUAL'
WHERE estado_global = 'DESPACHO_INCOMPLETO'
  AND cerrada_en IS NULL;

-- Ahora si: agregar la constraint de consistencia de cierre.
ALTER TABLE guia_master
    ADD CONSTRAINT chk_guia_master_cierre_consistente
    CHECK (
        -- Si la guia esta en un estado terminal, debe tener fecha y tipo de cierre
        (estado_global IN ('DESPACHO_COMPLETADO', 'DESPACHO_INCOMPLETO', 'CANCELADA')
            AND cerrada_en IS NOT NULL AND tipo_cierre IS NOT NULL)
        OR
        -- Si la guia no esta en estado terminal, no debe tener datos de cierre
        (estado_global NOT IN ('DESPACHO_COMPLETADO', 'DESPACHO_INCOMPLETO', 'CANCELADA')
            AND cerrada_en IS NULL AND tipo_cierre IS NULL
            AND cerrada_por_usuario_id IS NULL AND motivo_cierre IS NULL)
    );

-- 6) Recrear indice parcial de "guias activas" con los nuevos nombres ----
DROP INDEX IF EXISTS idx_guia_master_estado_activo;
CREATE INDEX idx_guia_master_estado_activo
    ON guia_master (estado_global, fecha_primera_pieza_despachada)
    WHERE estado_global IN (
        'EN_ESPERA_RECEPCION',
        'RECEPCION_PARCIAL',
        'RECEPCION_COMPLETA',
        'DESPACHO_PARCIAL',
        'EN_REVISION'
    );

-- 7) Tabla de historial de cambios de estado ----------------------------
CREATE TABLE guia_master_estado_historial (
    id                       BIGSERIAL PRIMARY KEY,
    guia_master_id           BIGINT      NOT NULL REFERENCES guia_master(id) ON DELETE CASCADE,
    estado_anterior          VARCHAR(40) NULL,
    estado_nuevo             VARCHAR(40) NOT NULL,
    tipo_cambio              VARCHAR(40) NOT NULL,
    motivo                   TEXT        NULL,
    cambiado_por_usuario_id  BIGINT      NULL REFERENCES usuario(id) ON DELETE SET NULL,
    cambiado_en              TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_guia_master_estado_hist_guia
    ON guia_master_estado_historial (guia_master_id, cambiado_en DESC);

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
        'REAPERTURA'
    ));

ALTER TABLE guia_master_estado_historial
    ADD CONSTRAINT chk_gm_estado_hist_estado_anterior
    CHECK (
        estado_anterior IS NULL
        OR estado_anterior IN (
            'EN_ESPERA_RECEPCION',
            'RECEPCION_PARCIAL',
            'RECEPCION_COMPLETA',
            'DESPACHO_PARCIAL',
            'DESPACHO_COMPLETADO',
            'DESPACHO_INCOMPLETO',
            'CANCELADA',
            'EN_REVISION',
            -- valores legados aceptados solo por compatibilidad historica
            'INCOMPLETA',
            'PARCIAL_RECIBIDA',
            'COMPLETA_RECIBIDA',
            'PARCIAL_DESPACHADA',
            'CERRADA',
            'CERRADA_CON_FALTANTE'
        )
    );

ALTER TABLE guia_master_estado_historial
    ADD CONSTRAINT chk_gm_estado_hist_estado_nuevo
    CHECK (estado_nuevo IN (
        'EN_ESPERA_RECEPCION',
        'RECEPCION_PARCIAL',
        'RECEPCION_COMPLETA',
        'DESPACHO_PARCIAL',
        'DESPACHO_COMPLETADO',
        'DESPACHO_INCOMPLETO',
        'CANCELADA',
        'EN_REVISION'
    ));

-- 8) Backfill: snapshot inicial del historial para guias existentes ------
INSERT INTO guia_master_estado_historial
    (guia_master_id, estado_anterior, estado_nuevo, tipo_cambio, motivo, cambiado_en)
SELECT id, NULL, estado_global, 'CREACION', 'Snapshot inicial al introducir el historial de estados', created_at
FROM guia_master;

-- 9) Comentarios para documentar el proposito de tablas y columnas ------
COMMENT ON COLUMN guia_master.cerrada_en              IS 'Fecha en que la guia paso a un estado terminal (DESPACHO_COMPLETADO, DESPACHO_INCOMPLETO o CANCELADA).';
COMMENT ON COLUMN guia_master.cerrada_por_usuario_id  IS 'Usuario que cerro la guia. NULL para cierres automaticos por sistema (timeout o recalculo).';
COMMENT ON COLUMN guia_master.tipo_cierre             IS 'Causa del cierre: DESPACHO_COMPLETADO | DESPACHO_INCOMPLETO_MANUAL | DESPACHO_INCOMPLETO_TIMEOUT | CANCELACION.';
COMMENT ON COLUMN guia_master.motivo_cierre           IS 'Texto libre con la justificacion del cierre (visible en auditoria).';

COMMENT ON TABLE  guia_master_estado_historial        IS 'Historial inmutable de cambios de estado_global de guia_master, con auditoria de actor, motivo y tipo de cambio.';
COMMENT ON COLUMN guia_master_estado_historial.tipo_cambio IS 'Origen del cambio: CREACION | RECALCULO_AUTOMATICO | CIERRE_MANUAL_FALTANTE | AUTO_CIERRE_TIMEOUT | CANCELACION | MARCAR_REVISION | SALIR_REVISION | REAPERTURA.';
