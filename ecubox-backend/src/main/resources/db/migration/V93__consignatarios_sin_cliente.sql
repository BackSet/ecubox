-- Permite que admin/operario registren consignatarios sin asociarlos aun a
-- un cliente real. La asignacion posterior se realiza desde
-- "Asignar consignatarios a cliente".
ALTER TABLE consignatario
    ALTER COLUMN usuario_id DROP NOT NULL;

COMMENT ON COLUMN consignatario.usuario_id IS
    'Cliente dueño del consignatario. Puede ser NULL si fue registrado por operación y aún no se asignó.';
