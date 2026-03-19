-- Leyenda y días máx. retiro por estado; fecha desde la que el paquete está en el estado actual
ALTER TABLE estado_rastreo ADD COLUMN leyenda TEXT NULL;
ALTER TABLE estado_rastreo ADD COLUMN dias_max_retiro INT NULL;

ALTER TABLE paquete ADD COLUMN fecha_estado_actual_desde TIMESTAMP NULL;

COMMENT ON COLUMN estado_rastreo.leyenda IS 'Mensaje para el cliente; puede incluir {dias}';
COMMENT ON COLUMN estado_rastreo.dias_max_retiro IS 'Días máx. para retiro (ej. en tránsito); usado en leyenda y cálculo';
COMMENT ON COLUMN paquete.fecha_estado_actual_desde IS 'Cuándo se asignó el estado actual';
