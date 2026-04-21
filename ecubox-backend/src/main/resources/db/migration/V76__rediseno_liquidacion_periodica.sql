-- V76: Rediseno del modulo Liquidacion como documento periodico.
--
-- Reemplaza el modelo 1:1 (envio_consolidado <-> liquidacion) introducido en
-- V75 por un documento de liquidacion que agrupa dos secciones independientes:
--   A) Costos al proveedor (USA -> EC): N consolidados con costo proveedor
--      e ingreso por cliente. Genera el margen bruto.
--   B) Costos del courier de entrega (en EC): M despachos con su tarifa
--      (kg incluidos + precio kg adicional). Genera el costo de distribucion.
-- Las dos secciones son independientes; un consolidado de A no necesita
-- corresponder a paquetes incluidos en los despachos de B.
--
-- Reglas:
--  - Un consolidado solo puede estar en UNA liquidacion (UNIQUE global).
--  - Un despacho solo puede estar en UNA liquidacion (UNIQUE global).
--  - Estado de pago unico por documento; al marcar pagada se sincroniza
--    envio_consolidado.estado_pago = PAGADO para los consolidados de A.
--  - Codigo auto LIQ-YYYY-NNNN (la generacion vive en el service).

-- 1. Drop V75 ----------------------------------------------------------------
DROP TABLE IF EXISTS liquidacion_distribucion_linea;
DROP TABLE IF EXISTS liquidacion_envio_consolidado;

-- 2. Secuencia para los codigos LIQ-YYYY-NNNN --------------------------------
CREATE SEQUENCE IF NOT EXISTS seq_liquidacion_codigo START 1;

-- 3. Liquidacion (header) ----------------------------------------------------
CREATE TABLE liquidacion (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    fecha_documento DATE NOT NULL DEFAULT CURRENT_DATE,
    periodo_desde DATE NULL,
    periodo_hasta DATE NULL,
    notas TEXT NULL,
    margen_bruto NUMERIC(14, 4) NOT NULL DEFAULT 0,
    total_costo_distribucion NUMERIC(14, 4) NOT NULL DEFAULT 0,
    ingreso_neto NUMERIC(14, 4) NOT NULL DEFAULT 0,
    estado_pago VARCHAR(20) NOT NULL DEFAULT 'NO_PAGADO',
    fecha_pago TIMESTAMP NULL,
    pagado_por_usuario_id BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_liquidacion_estado_pago
        CHECK (estado_pago IN ('NO_PAGADO', 'PAGADO')),
    CONSTRAINT chk_liquidacion_periodo
        CHECK (periodo_desde IS NULL OR periodo_hasta IS NULL OR periodo_desde <= periodo_hasta),
    CONSTRAINT fk_liquidacion_usuario
        FOREIGN KEY (pagado_por_usuario_id) REFERENCES usuario (id)
);

CREATE INDEX idx_liquidacion_fecha_documento ON liquidacion (fecha_documento);
CREATE INDEX idx_liquidacion_fecha_pago ON liquidacion (fecha_pago);
CREATE INDEX idx_liquidacion_estado_pago ON liquidacion (estado_pago);

COMMENT ON TABLE liquidacion IS
    'Documento de liquidacion periodica con dos secciones: costos al proveedor (consolidados) y costos del courier de entrega (despachos).';

-- 4. Seccion A: lineas de consolidados ---------------------------------------
CREATE TABLE liquidacion_consolidado_linea (
    id BIGSERIAL PRIMARY KEY,
    liquidacion_id BIGINT NOT NULL,
    envio_consolidado_id BIGINT NOT NULL,
    costo_proveedor NUMERIC(14, 4) NOT NULL DEFAULT 0,
    ingreso_cliente NUMERIC(14, 4) NOT NULL DEFAULT 0,
    margen_linea NUMERIC(14, 4) NOT NULL DEFAULT 0,
    notas TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_lcl_envio_consolidado UNIQUE (envio_consolidado_id),
    CONSTRAINT fk_lcl_liquidacion
        FOREIGN KEY (liquidacion_id) REFERENCES liquidacion (id) ON DELETE CASCADE,
    CONSTRAINT fk_lcl_envio_consolidado
        FOREIGN KEY (envio_consolidado_id) REFERENCES envio_consolidado (id)
);

CREATE INDEX idx_lcl_liquidacion ON liquidacion_consolidado_linea (liquidacion_id);

COMMENT ON TABLE liquidacion_consolidado_linea IS
    'Linea de costo al proveedor (USA->EC) por envio consolidado dentro de una liquidacion.';

-- 5. Seccion B: lineas de despachos ------------------------------------------
CREATE TABLE liquidacion_despacho_linea (
    id BIGSERIAL PRIMARY KEY,
    liquidacion_id BIGINT NOT NULL,
    despacho_id BIGINT NOT NULL,
    peso_kg NUMERIC(12, 4) NOT NULL DEFAULT 0,
    peso_lbs NUMERIC(12, 4) NOT NULL DEFAULT 0,
    kg_incluidos NUMERIC(12, 4) NOT NULL DEFAULT 0,
    precio_fijo NUMERIC(12, 4) NOT NULL DEFAULT 0,
    precio_kg_adicional NUMERIC(12, 4) NOT NULL DEFAULT 0,
    costo_calculado NUMERIC(14, 4) NOT NULL DEFAULT 0,
    notas TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ldl_despacho UNIQUE (despacho_id),
    CONSTRAINT fk_ldl_liquidacion
        FOREIGN KEY (liquidacion_id) REFERENCES liquidacion (id) ON DELETE CASCADE,
    CONSTRAINT fk_ldl_despacho
        FOREIGN KEY (despacho_id) REFERENCES despacho (id)
);

CREATE INDEX idx_ldl_liquidacion ON liquidacion_despacho_linea (liquidacion_id);

COMMENT ON TABLE liquidacion_despacho_linea IS
    'Linea de costo del courier de entrega (en EC) por despacho dentro de una liquidacion.';
