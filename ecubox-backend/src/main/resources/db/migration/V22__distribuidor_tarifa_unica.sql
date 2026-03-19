-- Una sola tarifa de envío por distribuidor (reemplaza domicilio y agencia)
ALTER TABLE distribuidor ADD COLUMN tarifa_envio DECIMAL(19,4) NOT NULL DEFAULT 0;
UPDATE distribuidor SET tarifa_envio = tarifa_base_domicilio;
ALTER TABLE distribuidor DROP COLUMN tarifa_base_domicilio;
ALTER TABLE distribuidor DROP COLUMN tarifa_base_agencia;

COMMENT ON COLUMN distribuidor.tarifa_envio IS 'Tarifa de envío única (antes separada en domicilio y agencia)';
