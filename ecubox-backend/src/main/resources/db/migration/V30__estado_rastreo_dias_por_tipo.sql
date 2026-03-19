-- Permite configurar días máximos de retiro por tipo de envío en cada estado de rastreo.
ALTER TABLE estado_rastreo ADD COLUMN dias_max_retiro_domicilio INTEGER;
ALTER TABLE estado_rastreo ADD COLUMN dias_max_retiro_agencia INTEGER;
ALTER TABLE estado_rastreo ADD COLUMN dias_max_retiro_agencia_distribuidor INTEGER;
