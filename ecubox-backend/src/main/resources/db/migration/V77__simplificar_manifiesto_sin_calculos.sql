-- =====================================================================
-- V77: Simplificar manifiesto a un agrupador logistico de despachos.
--
-- Contexto:
-- El modulo de Liquidaciones (V76) absorbe toda la logica monetaria
-- (costos al proveedor, ingresos del cliente, costos de distribucion,
-- estado de pago, etc). El manifiesto deja de ser un documento de
-- liquidacion y se convierte en un simple agrupador que registra que
-- despachos se enviaron en un periodo (a una agencia, punto de entrega
-- o domicilio del consignatario), sin importes ni estado de pago.
--
-- Cambios:
--   1. Drop columnas monetarias y de estado de la tabla manifiesto.
--   2. Drop indice sobre estado.
--   3. Actualizar comentario de la tabla.
--
-- Nota: Se conservan codigo, fechas, filtro_tipo, filtros opcionales,
-- cantidad_despachos (denormalizado para listados rapidos), version y
-- la relacion con despacho.
-- =====================================================================

DROP INDEX IF EXISTS idx_manifiesto_estado;

ALTER TABLE manifiesto
    DROP COLUMN IF EXISTS subtotal_domicilio,
    DROP COLUMN IF EXISTS subtotal_agencia_flete,
    DROP COLUMN IF EXISTS subtotal_comision_agencias,
    DROP COLUMN IF EXISTS total_pagar,
    DROP COLUMN IF EXISTS estado;

COMMENT ON TABLE manifiesto IS 'Agrupador logistico de despachos enviados en un periodo (a domicilio, agencia o punto de entrega). Sin calculos monetarios; los importes y el estado de pago los maneja el modulo de Liquidaciones.';
