-- Leyenda por tipo de envío: el operario puede configurar mensajes distintos por tipo (Domicilio, Agencia, Agencia distribuidor) en un estado.
ALTER TABLE estado_rastreo ADD COLUMN leyenda_por_tipo_entrega BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE estado_rastreo ADD COLUMN leyenda_domicilio TEXT;
ALTER TABLE estado_rastreo ADD COLUMN leyenda_agencia TEXT;
ALTER TABLE estado_rastreo ADD COLUMN leyenda_agencia_distribuidor TEXT;
