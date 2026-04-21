-- V75: Modulo "Liquidacion del envio consolidado".
--
-- Introduce:
--  1. Tabla `config_tarifa_distribucion` (singleton id=1) con la tarifa por
--     defecto que se precarga al construir cada linea de liquidacion. Si el
--     operario la modifica al guardar una linea, los valores se promueven a
--     este singleton (write-back) desde el service.
--  2. Tabla `liquidacion_envio_consolidado`: 1:1 con envio_consolidado.
--     Contiene los bloques de margen (costoProveedor / ingresoCliente), totales
--     y estado de pago (independiente de abierto/cerrado).
--  3. Tabla `liquidacion_distribucion_linea`: N por liquidacion, una por
--     despacho. Con la regla de calculo
--       costo = precio_fijo + max(0, peso_kg - kg_incluidos) * precio_kg_adicional
--  4. Columna `estado_pago` en envio_consolidado, sincronizada por el service
--     para listados/filtros rapidos sin JOIN.
--  5. Permisos: LIQUIDACION_CONSOLIDADO_READ, LIQUIDACION_CONSOLIDADO_WRITE,
--     CONFIG_TARIFA_DISTRIBUCION_WRITE.

-- 1. Tabla config_tarifa_distribucion (singleton) -----------------------------
CREATE TABLE IF NOT EXISTS config_tarifa_distribucion (
    id BIGINT PRIMARY KEY,
    kg_incluidos NUMERIC(12, 4) NOT NULL DEFAULT 0,
    precio_fijo NUMERIC(12, 4) NOT NULL DEFAULT 0,
    precio_kg_adicional NUMERIC(12, 4) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NULL,
    updated_by_usuario_id BIGINT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_config_tarifa_distribucion_usuario
        FOREIGN KEY (updated_by_usuario_id) REFERENCES usuario (id)
);

INSERT INTO config_tarifa_distribucion (id, kg_incluidos, precio_fijo, precio_kg_adicional, updated_at, version)
VALUES (1, 2.0000, 2.7500, 0.5000, CURRENT_TIMESTAMP, 0)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE config_tarifa_distribucion IS
    'Singleton (id=1) con la tarifa por defecto del courier de entrega usada en liquidaciones.';
COMMENT ON COLUMN config_tarifa_distribucion.kg_incluidos IS
    'Kg incluidos dentro de la tarifa fija (ej: 2 kg).';
COMMENT ON COLUMN config_tarifa_distribucion.precio_fijo IS
    'Precio fijo cobrado por los kg incluidos (ej: 2.75 USD).';
COMMENT ON COLUMN config_tarifa_distribucion.precio_kg_adicional IS
    'Precio por cada kg adicional sobre los kg incluidos (ej: 0.50 USD).';

-- 2. Tabla liquidacion_envio_consolidado -------------------------------------
CREATE TABLE IF NOT EXISTS liquidacion_envio_consolidado (
    id BIGSERIAL PRIMARY KEY,
    envio_consolidado_id BIGINT NOT NULL,
    guia_proveedor VARCHAR(120) NULL,
    costo_proveedor NUMERIC(14, 4) NOT NULL DEFAULT 0,
    ingreso_cliente NUMERIC(14, 4) NOT NULL DEFAULT 0,
    margen_bruto NUMERIC(14, 4) NOT NULL DEFAULT 0,
    total_costo_distribucion NUMERIC(14, 4) NOT NULL DEFAULT 0,
    ingreso_neto NUMERIC(14, 4) NOT NULL DEFAULT 0,
    estado_pago VARCHAR(20) NOT NULL DEFAULT 'NO_PAGADO',
    fecha_pago TIMESTAMP NULL,
    pagado_por_usuario_id BIGINT NULL,
    notas TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_liquidacion_envio_consolidado_envio
        UNIQUE (envio_consolidado_id),
    CONSTRAINT fk_liquidacion_envio_consolidado_envio
        FOREIGN KEY (envio_consolidado_id) REFERENCES envio_consolidado (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_liquidacion_envio_consolidado_usuario
        FOREIGN KEY (pagado_por_usuario_id) REFERENCES usuario (id),
    CONSTRAINT chk_liquidacion_envio_consolidado_estado_pago
        CHECK (estado_pago IN ('NO_PAGADO', 'PAGADO'))
);

CREATE INDEX IF NOT EXISTS idx_liquidacion_envio_consolidado_estado_pago
    ON liquidacion_envio_consolidado (estado_pago);

COMMENT ON TABLE liquidacion_envio_consolidado IS
    'Liquidacion financiera (1:1) por envio consolidado. Margen + distribucion + ingreso neto.';

-- 3. Tabla liquidacion_distribucion_linea ------------------------------------
CREATE TABLE IF NOT EXISTS liquidacion_distribucion_linea (
    id BIGSERIAL PRIMARY KEY,
    liquidacion_id BIGINT NOT NULL,
    despacho_id BIGINT NOT NULL,
    peso_kg NUMERIC(12, 4) NOT NULL DEFAULT 0,
    peso_lbs NUMERIC(12, 4) NOT NULL DEFAULT 0,
    kg_incluidos NUMERIC(12, 4) NOT NULL DEFAULT 0,
    precio_fijo NUMERIC(12, 4) NOT NULL DEFAULT 0,
    precio_kg_adicional NUMERIC(12, 4) NOT NULL DEFAULT 0,
    costo_calculado NUMERIC(14, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_liquidacion_despacho UNIQUE (liquidacion_id, despacho_id),
    CONSTRAINT fk_linea_liquidacion
        FOREIGN KEY (liquidacion_id) REFERENCES liquidacion_envio_consolidado (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_linea_despacho
        FOREIGN KEY (despacho_id) REFERENCES despacho (id)
);

CREATE INDEX IF NOT EXISTS idx_linea_liquidacion
    ON liquidacion_distribucion_linea (liquidacion_id);

COMMENT ON TABLE liquidacion_distribucion_linea IS
    'Linea de costo del courier de entrega por despacho dentro de una liquidacion.';

-- 4. Columna estado_pago en envio_consolidado --------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'envio_consolidado' AND column_name = 'estado_pago'
    ) THEN
        ALTER TABLE envio_consolidado
            ADD COLUMN estado_pago VARCHAR(20) NOT NULL DEFAULT 'NO_PAGADO';

        ALTER TABLE envio_consolidado
            ADD CONSTRAINT chk_envio_consolidado_estado_pago
            CHECK (estado_pago IN ('NO_PAGADO', 'PAGADO'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_envio_consolidado_estado_pago
    ON envio_consolidado (estado_pago);

-- 5. Permisos -----------------------------------------------------------------
INSERT INTO permiso (codigo, descripcion) VALUES
    ('LIQUIDACION_CONSOLIDADO_READ',  'Ver la liquidacion del envio consolidado'),
    ('LIQUIDACION_CONSOLIDADO_WRITE', 'Editar la liquidacion del envio consolidado'),
    ('CONFIG_TARIFA_DISTRIBUCION_WRITE', 'Editar la tarifa por defecto del courier de entrega')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre IN ('OPERARIO', 'ADMIN')
  AND p.codigo IN ('LIQUIDACION_CONSOLIDADO_READ', 'LIQUIDACION_CONSOLIDADO_WRITE')
ON CONFLICT DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'ADMIN'
  AND p.codigo = 'CONFIG_TARIFA_DISTRIBUCION_WRITE'
ON CONFLICT DO NOTHING;
