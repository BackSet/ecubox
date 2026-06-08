-- Los consignatarios registrados por administradores u operarios en produccion
-- no deben quedar como propiedad de esas cuentas internas. Se dejan sin cliente
-- dueño para que luego puedan asignarse desde "Asignar consignatarios a cliente".
--
-- Tambien se limpia la asociacion cliente_usuario_id de las guias master ligadas
-- a esos consignatarios, evitando que el historial siga apareciendo como propio
-- del administrador/operario antes de la reasignacion real.

WITH consignatarios_operacion AS (
    SELECT DISTINCT c.id
    FROM consignatario c
    JOIN usuario_rol ur ON ur.usuario_id = c.usuario_id
    JOIN rol r ON r.id = ur.rol_id
    WHERE r.nombre IN ('ADMIN', 'OPERARIO')
)
UPDATE guia_master gm
SET cliente_usuario_id = NULL
WHERE gm.consignatario_id IN (SELECT id FROM consignatarios_operacion)
  AND gm.cliente_usuario_id IN (
      SELECT ur.usuario_id
      FROM usuario_rol ur
      JOIN rol r ON r.id = ur.rol_id
      WHERE r.nombre IN ('ADMIN', 'OPERARIO')
  );

UPDATE consignatario c
SET usuario_id = NULL
WHERE EXISTS (
    SELECT 1
    FROM usuario_rol ur
    JOIN rol r ON r.id = ur.rol_id
    WHERE ur.usuario_id = c.usuario_id
      AND r.nombre IN ('ADMIN', 'OPERARIO')
);
