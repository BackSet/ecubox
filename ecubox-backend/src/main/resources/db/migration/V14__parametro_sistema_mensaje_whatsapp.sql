-- Parámetros de sistema (clave-valor). Reutilizable para más configuraciones.
CREATE TABLE parametro_sistema (
    clave VARCHAR(255) PRIMARY KEY,
    valor TEXT
);

INSERT INTO parametro_sistema (clave, valor) VALUES ('mensaje_whatsapp_despacho', '');

COMMENT ON TABLE parametro_sistema IS 'Configuración global del sistema (mensaje WhatsApp despacho, etc.)';
