-- Tiempos máximos de retiro por entidad operativa.
ALTER TABLE agencia ADD COLUMN dias_max_retiro INTEGER;
ALTER TABLE agencia_distribuidor ADD COLUMN dias_max_retiro INTEGER;
ALTER TABLE distribuidor ADD COLUMN dias_max_retiro_domicilio INTEGER;
