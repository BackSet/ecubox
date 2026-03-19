-- Campos para registro de cliente: nombres, cédula, teléfono
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS nombres VARCHAR(255);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS cedula VARCHAR(50);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);

-- Cédula única por usuario (permite NULL para usuarios que no son clientes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_cedula_unique ON usuario(cedula) WHERE cedula IS NOT NULL AND cedula != '';

COMMENT ON COLUMN usuario.nombres IS 'Nombres completos (obligatorio para clientes)';
COMMENT ON COLUMN usuario.cedula IS 'Cédula de identidad (única, obligatoria para clientes)';
COMMENT ON COLUMN usuario.telefono IS 'Número de teléfono';
