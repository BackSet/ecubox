-- V94 corrigio los registros existentes en ese momento, pero una cuenta con
-- roles CLIENTE + ADMIN/OPERARIO podia volver a asignarse como cliente por API.
-- Se limpian esas asociaciones posteriores sin afectar clientes reales.

WITH usuarios_internos AS (
    SELECT DISTINCT ur.usuario_id
    FROM usuario_rol ur
    JOIN rol r ON r.id = ur.rol_id
    WHERE UPPER(TRIM(r.nombre)) IN ('ADMIN', 'OPERARIO')
),
consignatarios_internos AS (
    SELECT c.id, c.usuario_id
    FROM consignatario c
    WHERE c.usuario_id IN (SELECT usuario_id FROM usuarios_internos)
)
UPDATE guia_master gm
SET cliente_usuario_id = NULL
FROM consignatarios_internos ci
WHERE gm.consignatario_id = ci.id
  AND gm.cliente_usuario_id = ci.usuario_id;

UPDATE consignatario c
SET usuario_id = NULL
WHERE c.usuario_id IN (
    SELECT DISTINCT ur.usuario_id
    FROM usuario_rol ur
    JOIN rol r ON r.id = ur.rol_id
    WHERE UPPER(TRIM(r.nombre)) IN ('ADMIN', 'OPERARIO')
);
