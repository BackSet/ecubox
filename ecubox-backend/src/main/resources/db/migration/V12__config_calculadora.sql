-- Configuración única para la calculadora pública: tarifa por libra
CREATE TABLE config_calculadora (
    id BIGINT PRIMARY KEY,
    tarifa_por_libra DECIMAL(19,4) NOT NULL DEFAULT 0
);

INSERT INTO config_calculadora (id, tarifa_por_libra) VALUES (1, 0);

COMMENT ON TABLE config_calculadora IS 'Configuración de la calculadora pública (un solo registro id=1)';
