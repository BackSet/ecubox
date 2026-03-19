-- Dominio operativo ECUBOX: destinatario final, agencia, distribuidor, paquete, saca, despacho, manifiesto

-- 1. Catálogo y destinatario
CREATE TABLE destinatario_final (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    direccion TEXT,
    provincia VARCHAR(100),
    canton VARCHAR(100),
    codigo VARCHAR(50)
);

CREATE TABLE agencia (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    encargado VARCHAR(255),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    direccion VARCHAR(255),
    provincia VARCHAR(100),
    canton VARCHAR(100),
    horario_atencion TEXT,
    tarifa_servicio DECIMAL(19,4) NOT NULL DEFAULT 0
);

CREATE TABLE distribuidor (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255),
    tarifa_base_domicilio DECIMAL(19,4) NOT NULL DEFAULT 0,
    tarifa_base_agencia DECIMAL(19,4) NOT NULL DEFAULT 0
);

-- 2. Manifiesto (antes de despacho para poder referenciarlo)
CREATE TABLE manifiesto (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    filtro_tipo VARCHAR(50) NOT NULL,
    filtro_distribuidor_id BIGINT REFERENCES distribuidor(id) ON DELETE SET NULL,
    filtro_agencia_id BIGINT REFERENCES agencia(id) ON DELETE SET NULL,
    cantidad_despachos INT NOT NULL DEFAULT 0,
    subtotal_domicilio DECIMAL(19,4) NOT NULL DEFAULT 0,
    subtotal_agencia_flete DECIMAL(19,4) NOT NULL DEFAULT 0,
    subtotal_comision_agencias DECIMAL(19,4) NOT NULL DEFAULT 0,
    total_pagar DECIMAL(19,4) NOT NULL DEFAULT 0,
    estado VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE'
);

-- 3. Despacho (ruta y guía final)
CREATE TABLE despacho (
    id BIGSERIAL PRIMARY KEY,
    numero_guia VARCHAR(100) NOT NULL,
    observaciones TEXT,
    codigo_precinto VARCHAR(100),
    distribuidor_id BIGINT NOT NULL REFERENCES distribuidor(id) ON DELETE RESTRICT,
    tipo_entrega VARCHAR(50) NOT NULL,
    destinatario_final_id BIGINT REFERENCES destinatario_final(id) ON DELETE SET NULL,
    agencia_id BIGINT REFERENCES agencia(id) ON DELETE SET NULL,
    manifiesto_id BIGINT REFERENCES manifiesto(id) ON DELETE SET NULL,
    CONSTRAINT chk_despacho_tipo_entrega CHECK (
        (tipo_entrega = 'DOMICILIO' AND destinatario_final_id IS NOT NULL AND agencia_id IS NULL) OR
        (tipo_entrega = 'AGENCIA' AND agencia_id IS NOT NULL AND destinatario_final_id IS NULL)
    )
);

-- 4. Saca (contenedor físico)
CREATE TABLE saca (
    id BIGSERIAL PRIMARY KEY,
    numero_orden VARCHAR(100) NOT NULL UNIQUE,
    peso_lbs DECIMAL(12,4),
    peso_kg DECIMAL(12,4),
    tamanio VARCHAR(50),
    despacho_id BIGINT REFERENCES despacho(id) ON DELETE SET NULL
);

-- 5. Paquete (ítem individual)
CREATE TABLE paquete (
    id BIGSERIAL PRIMARY KEY,
    numero_guia VARCHAR(100) NOT NULL UNIQUE,
    peso_lbs DECIMAL(12,4),
    peso_kg DECIMAL(12,4),
    contenido VARCHAR(500),
    estado_rastreo VARCHAR(50) NOT NULL,
    destinatario_final_id BIGINT NOT NULL REFERENCES destinatario_final(id) ON DELETE RESTRICT,
    saca_id BIGINT REFERENCES saca(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_destinatario_final_usuario_id ON destinatario_final(usuario_id);
CREATE INDEX idx_manifiesto_filtro_distribuidor ON manifiesto(filtro_distribuidor_id);
CREATE INDEX idx_manifiesto_filtro_agencia ON manifiesto(filtro_agencia_id);
CREATE INDEX idx_manifiesto_estado ON manifiesto(estado);
CREATE INDEX idx_despacho_distribuidor_id ON despacho(distribuidor_id);
CREATE INDEX idx_despacho_tipo_entrega ON despacho(tipo_entrega);
CREATE INDEX idx_despacho_manifiesto_id ON despacho(manifiesto_id);
CREATE INDEX idx_saca_despacho_id ON saca(despacho_id);
CREATE INDEX idx_paquete_destinatario_final_id ON paquete(destinatario_final_id);
CREATE INDEX idx_paquete_saca_id ON paquete(saca_id);
CREATE INDEX idx_paquete_estado_rastreo ON paquete(estado_rastreo);

-- Comentarios
COMMENT ON TABLE destinatario_final IS 'A quién y a dónde va el paquete si es a domicilio; pertenece a un usuario';
COMMENT ON TABLE agencia IS 'Punto de retiro; tarifa_servicio es comisión por paquete/saca entregada';
COMMENT ON TABLE distribuidor IS 'Transportista; tarifas base domicilio y agencia';
COMMENT ON TABLE paquete IS 'Ítem individual que llega a bodega; tracking USA';
COMMENT ON TABLE saca IS 'Contenedor físico que agrupa paquetes';
COMMENT ON TABLE despacho IS 'Movimiento maestro: guía del distribuidor, tipo entrega (domicilio/agencia)';
COMMENT ON TABLE manifiesto IS 'Documento de liquidación de un periodo; totales calculados desde despachos';
