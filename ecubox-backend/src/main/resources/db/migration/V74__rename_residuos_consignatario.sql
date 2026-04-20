-- V74: Rename residuos finales de "destinatario" a "consignatario".
--
-- Cubre los rezagos no migrados por V71:
--  1) Vista materializada / read-model `tracking_view_paquete`: columnas
--     destinatario_id, destinatario_nombre, destinatario_provincia,
--     destinatario_canton -> consignatario_*.
--  2) Indice GIN trigram `idx_destinatario_nombre_trgm` (V65) ->
--     `idx_consignatario_nombre_trgm`.
--  3) Plantillas WhatsApp/Email guardadas en `parametro_sistema.valor` que
--     contengan el placeholder `{{destinatarioNombre}}` -> `{{consignatarioNombre}}`.
--     Tambien la variante con espacios `{{ destinatarioNombre }}`.
--
-- Idempotente: usa DO $$ ... IF EXISTS para soportar reaplicacion sobre
-- bases ya migradas (parcial o totalmente).

-- 1) Renombrar columnas en tracking_view_paquete -------------------------------

DO $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tracking_view_paquete' AND column_name = 'destinatario_id'
  ) THEN
    ALTER TABLE tracking_view_paquete RENAME COLUMN destinatario_id TO consignatario_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tracking_view_paquete' AND column_name = 'destinatario_nombre'
  ) THEN
    ALTER TABLE tracking_view_paquete RENAME COLUMN destinatario_nombre TO consignatario_nombre;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tracking_view_paquete' AND column_name = 'destinatario_provincia'
  ) THEN
    ALTER TABLE tracking_view_paquete RENAME COLUMN destinatario_provincia TO consignatario_provincia;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tracking_view_paquete' AND column_name = 'destinatario_canton'
  ) THEN
    ALTER TABLE tracking_view_paquete RENAME COLUMN destinatario_canton TO consignatario_canton;
  END IF;
END $$;

-- 2) Renombrar indice GIN trigram --------------------------------------------

DO $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM pg_class WHERE relname = 'idx_destinatario_nombre_trgm' AND relkind = 'i'
  ) THEN
    ALTER INDEX idx_destinatario_nombre_trgm RENAME TO idx_consignatario_nombre_trgm;
  END IF;
END $$;

-- 3) Actualizar placeholder {{destinatarioNombre}} en plantillas -------------

DO $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'parametro_sistema'
  ) THEN
    UPDATE parametro_sistema
       SET valor = REPLACE(valor, '{{destinatarioNombre}}', '{{consignatarioNombre}}')
     WHERE valor LIKE '%{{destinatarioNombre}}%';

    UPDATE parametro_sistema
       SET valor = REPLACE(valor, '{{ destinatarioNombre }}', '{{ consignatarioNombre }}')
     WHERE valor LIKE '%{{ destinatarioNombre }}%';
  END IF;
END $$;
