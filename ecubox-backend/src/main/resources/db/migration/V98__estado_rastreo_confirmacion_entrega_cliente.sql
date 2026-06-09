-- Parámetros para la confirmación de entrega por parte del cliente:
--  - estado_rastreo_entrega_confirmada_cliente: estado que se aplica cuando el
--    cliente confirma que recibió su parte del despacho.
--  - estado_rastreo_aviso_confirmacion_entrega: estado que, al aplicarse a un
--    paquete, dispara el aviso (push) para que el cliente confirme la entrega.
--
-- Se insertan vacíos: cada entorno asigna el ID del estado correspondiente desde
-- Parámetros → Estados de rastreo por punto (el valor es un ID de estado_rastreo,
-- que difiere por entorno).
INSERT INTO parametro_sistema (clave, valor) VALUES
    ('estado_rastreo_entrega_confirmada_cliente', ''),
    ('estado_rastreo_aviso_confirmacion_entrega', '')
ON CONFLICT (clave) DO NOTHING;
