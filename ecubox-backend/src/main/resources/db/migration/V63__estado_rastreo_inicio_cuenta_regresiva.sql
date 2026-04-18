-- Nuevo punto del flujo: estado que ANCLA el inicio de la cuenta regresiva en tracking.
-- Cuando está configurado, la cuenta regresiva se calcula desde la primera vez que el
-- paquete entró a ese estado (no desde el último cambio de estado).
-- Por defecto vacío (NULL) => se mantiene el comportamiento histórico (último estado).
INSERT INTO parametro_sistema (clave, valor) VALUES
    ('estado_rastreo_inicio_cuenta_regresiva', '')
ON CONFLICT (clave) DO NOTHING;
