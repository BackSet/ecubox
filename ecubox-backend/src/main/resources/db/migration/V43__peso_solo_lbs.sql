-- Unifica persistencia de peso en libras.
-- Mantiene el dato existente priorizando peso_lbs y usando peso_kg como respaldo.

UPDATE paquete
SET peso_lbs = ROUND((peso_kg * 2.20462262185)::numeric, 4)
WHERE peso_lbs IS NULL
  AND peso_kg IS NOT NULL;

UPDATE saca
SET peso_lbs = ROUND((peso_kg * 2.20462262185)::numeric, 4)
WHERE peso_lbs IS NULL
  AND peso_kg IS NOT NULL;

ALTER TABLE paquete DROP COLUMN IF EXISTS peso_kg;
ALTER TABLE saca DROP COLUMN IF EXISTS peso_kg;
