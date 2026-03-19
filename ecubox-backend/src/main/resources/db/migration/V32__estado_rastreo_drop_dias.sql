-- Limpieza fuerte: los días máximos de retiro ahora viven en entidades operativas.
ALTER TABLE estado_rastreo DROP COLUMN dias_max_retiro;
ALTER TABLE estado_rastreo DROP COLUMN dias_max_retiro_domicilio;
ALTER TABLE estado_rastreo DROP COLUMN dias_max_retiro_agencia;
ALTER TABLE estado_rastreo DROP COLUMN dias_max_retiro_agencia_distribuidor;
