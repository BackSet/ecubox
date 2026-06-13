-- Identificador de negocio visible y estable para cada enlace de acceso.
-- Formato ACC-000001. Es un código de presentación/búsqueda: NO reemplaza al
-- token ni se usa para autenticar el acceso (el canje sigue siendo por token/hash).

-- 1. Columna nullable inicialmente, para poder hacer backfill.
ALTER TABLE acceso_enlace ADD COLUMN codigo VARCHAR(20);

-- 2. Backfill de los enlaces existentes usando su id (ACC-000123).
UPDATE acceso_enlace
SET codigo = 'ACC-' || LPAD(id::text, 6, '0')
WHERE codigo IS NULL;

-- 3. Marcar NOT NULL una vez backfilleados.
ALTER TABLE acceso_enlace ALTER COLUMN codigo SET NOT NULL;

-- 4. Unicidad del código.
ALTER TABLE acceso_enlace
    ADD CONSTRAINT uq_acceso_enlace_codigo UNIQUE (codigo);

-- 5. Sembrar la secuencia atómica de códigos (codigo_secuencia) en MAX(id),
--    de modo que los próximos códigos ACC-{n} queden por encima de los ya
--    backfilleados y nunca colisionen con el UNIQUE. El servicio consume esta
--    secuencia con CodigoSecuenciaService al generar cada enlace nuevo.
INSERT INTO codigo_secuencia (entity, scope_key, next_value)
VALUES ('ACCESO_ENLACE', 'GLOBAL', (SELECT COALESCE(MAX(id), 0) FROM acceso_enlace))
ON CONFLICT (entity, scope_key) DO NOTHING;
