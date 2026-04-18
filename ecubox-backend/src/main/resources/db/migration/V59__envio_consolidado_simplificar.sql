-- Simplificacion del envio consolidado: el alta solo requiere codigo y la lista
-- de guias asociadas. La metadata libre (origen, destino, observaciones) se
-- elimina del modelo porque ya no se ingresa ni se edita desde la UI.

ALTER TABLE envio_consolidado DROP COLUMN IF EXISTS origen_oficina;
ALTER TABLE envio_consolidado DROP COLUMN IF EXISTS destino;
ALTER TABLE envio_consolidado DROP COLUMN IF EXISTS observaciones;
