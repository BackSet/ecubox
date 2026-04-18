-- Nuevo punto del flujo: estado al asociar paquete con guía master (consolidado)
-- Por defecto deja vacío (NULL) para que el operario lo configure explícitamente.
-- Si ya existe se respeta el valor actual.
INSERT INTO parametro_sistema (clave, valor) VALUES
    ('estado_rastreo_asociar_guia_master', '')
ON CONFLICT (clave) DO NOTHING;

COMMENT ON COLUMN parametro_sistema.clave IS
    'Clave del parámetro. Para estado_rastreo_asociar_guia_master: ID del estado_rastreo aplicado al asociar un paquete con su guía master de consolidado. Vacío = no aplicar cambio de estado.';
