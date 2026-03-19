-- Eliminar columna nombre de agencia_distribuidor.
-- El código se autogenera en backend; la identificación en UI es provincia + cantón + código.
ALTER TABLE agencia_distribuidor DROP COLUMN IF EXISTS nombre;
