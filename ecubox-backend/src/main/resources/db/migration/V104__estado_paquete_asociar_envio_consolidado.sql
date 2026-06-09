-- Punto automático para el estado aplicado al asociar un paquete a un envío
-- consolidado. PLANILLA mantiene la secuencia operativa actual:
-- REGISTRADO -> PLANILLA -> MANIFESTADO -> VUELO.
INSERT INTO parametro_sistema (clave, valor)
SELECT 'estado_rastreo_asociar_envio_consolidado', er.id::TEXT
FROM estado_rastreo er
WHERE er.codigo = 'PLANILLA'
  AND er.activo IS TRUE
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;
