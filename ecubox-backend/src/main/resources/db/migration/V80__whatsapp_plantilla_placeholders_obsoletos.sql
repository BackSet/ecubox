-- Renombra placeholders obsoletos en plantillas guardadas (parametro_sistema).
-- Complementa V74 (destinatarioNombre -> consignatarioNombre).

DO $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'parametro_sistema'
  ) THEN
    UPDATE parametro_sistema
       SET valor = REPLACE(valor, '{{distribuidorNombre}}', '{{courierEntregaNombre}}')
     WHERE valor LIKE '%{{distribuidorNombre}}%';

    UPDATE parametro_sistema
       SET valor = REPLACE(valor, '{{ distribuidorNombre }}', '{{ courierEntregaNombre }}')
     WHERE valor LIKE '%{{ distribuidorNombre }}%';
  END IF;
END $$;
