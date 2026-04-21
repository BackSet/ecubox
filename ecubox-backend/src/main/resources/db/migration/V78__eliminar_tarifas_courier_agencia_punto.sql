-- ============================================================
-- V78: Eliminar tarifas de los modelos maestros de
--      Courier de entrega, Agencia y Agencia/Punto de courier.
-- ============================================================
--
-- Las tarifas economicas pasaron a ser responsabilidad exclusiva
-- del modulo de Liquidaciones (config_tarifa_distribucion +
-- liquidacion_despacho_linea). Los modelos de couriers, agencias
-- y puntos de entrega quedan como catalogos puramente logisticos
-- (datos de contacto, direccion, identificadores, tracking).
--
-- Esto incluye las tablas SCD2 *_version: la liquidacion no
-- depende de los snapshots tarifarios historicos, asi que se
-- pueden borrar sin riesgo. Si en el futuro se necesita
-- reconstruir el costo de un despacho, sera con la tarifa
-- vigente en el documento de liquidacion al que pertenezca.
-- ============================================================

ALTER TABLE agencia_version
    DROP COLUMN IF EXISTS tarifa_servicio;

ALTER TABLE agencia_courier_entrega_version
    DROP COLUMN IF EXISTS tarifa;

ALTER TABLE agencia
    DROP COLUMN IF EXISTS tarifa_servicio;

ALTER TABLE agencia_courier_entrega
    DROP COLUMN IF EXISTS tarifa;

ALTER TABLE courier_entrega
    DROP COLUMN IF EXISTS tarifa_envio;

COMMENT ON TABLE courier_entrega IS
    'Catalogo logistico de couriers de entrega (Servientrega, Tramaco, etc.). '
    'Sin tarifas: los costos los calcula el modulo de Liquidaciones.';

COMMENT ON TABLE agencia IS
    'Catalogo logistico de agencias receptoras. Sin tarifas: los costos '
    'los calcula el modulo de Liquidaciones.';

COMMENT ON TABLE agencia_courier_entrega IS
    'Punto de entrega/oficina del courier. Sin tarifas: los costos los '
    'calcula el modulo de Liquidaciones.';
