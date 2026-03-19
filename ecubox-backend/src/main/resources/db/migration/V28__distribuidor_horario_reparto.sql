-- Horario de reparto del distribuidor (usado en leyenda de tracking).
ALTER TABLE distribuidor ADD COLUMN IF NOT EXISTS horario_reparto TEXT;
