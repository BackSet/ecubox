-- Permisos para que operario y admin configuren la tarifa de la calculadora pública
INSERT INTO permiso (codigo, descripcion) VALUES
    ('TARIFA_CALCULADORA_READ', 'Ver tarifa calculadora por libra'),
    ('TARIFA_CALCULADORA_WRITE', 'Configurar tarifa calculadora por libra');

-- Asignar a OPERARIO
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'OPERARIO' AND p.codigo IN ('TARIFA_CALCULADORA_READ', 'TARIFA_CALCULADORA_WRITE');

-- Asignar a ADMIN
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'ADMIN' AND p.codigo IN ('TARIFA_CALCULADORA_READ', 'TARIFA_CALCULADORA_WRITE');
