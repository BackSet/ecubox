-- Tablas para múltiples teléfonos y direcciones por cliente
CREATE TABLE cliente_telefono (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    numero VARCHAR(50) NOT NULL
);

CREATE TABLE cliente_direccion (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    ciudad VARCHAR(100) NOT NULL,
    canton VARCHAR(100) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    referencia VARCHAR(255)
);

CREATE INDEX idx_cliente_telefono_usuario_id ON cliente_telefono(usuario_id);
CREATE INDEX idx_cliente_direccion_usuario_id ON cliente_direccion(usuario_id);

COMMENT ON TABLE cliente_telefono IS 'Teléfonos del cliente (uno o varios por usuario)';
COMMENT ON TABLE cliente_direccion IS 'Direcciones del cliente (ciudad, cantón, dirección, referencia)';
