INSERT INTO parametro_sistema (clave, valor)
VALUES ('canales_comunicacion', '{}')
ON CONFLICT (clave) DO NOTHING;
