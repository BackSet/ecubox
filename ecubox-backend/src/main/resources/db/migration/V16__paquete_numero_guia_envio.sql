-- Guía de envío del consolidador: asociada a paquetes ECUBOX (varios paquetes pueden compartir la misma)
ALTER TABLE paquete ADD COLUMN numero_guia_envio VARCHAR(100) NULL;
CREATE INDEX idx_paquete_numero_guia_envio ON paquete(numero_guia_envio);

COMMENT ON COLUMN paquete.numero_guia_envio IS 'Número de guía de envío asignado por el consolidador; puede repetirse en varios paquetes';
