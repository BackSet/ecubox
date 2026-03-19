-- Simplifica el modelo de autenticación de usuario a datos mínimos de acceso.
DROP INDEX IF EXISTS idx_usuario_cedula_unique;

ALTER TABLE usuario
    DROP COLUMN IF EXISTS nombres,
    DROP COLUMN IF EXISTS cedula,
    DROP COLUMN IF EXISTS telefono;
