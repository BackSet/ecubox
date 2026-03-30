-- Normalizar tipos de flujo obsoletos
UPDATE estado_rastreo SET tipo_flujo = 'NORMAL' WHERE tipo_flujo = 'MIXTO';

-- Matriz de transiciones ya no se usa
DROP TABLE IF EXISTS estado_rastreo_transicion;

-- Sin estados bloqueantes en catálogo
ALTER TABLE estado_rastreo DROP COLUMN IF EXISTS bloqueante;

-- Paquetes que quedaron bloqueados por la lógica anterior
UPDATE paquete SET bloqueado = FALSE, fecha_bloqueo_desde = NULL WHERE bloqueado = TRUE;
