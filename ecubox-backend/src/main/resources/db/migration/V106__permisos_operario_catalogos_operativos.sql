-- OPERARIO necesita acceder a los catálogos operativos para el flujo de despachos
-- y para gestionar manifiestos. Estos permisos solo se habían asignado a ADMIN.
--
-- Catálogos de entrega (agencias, couriers, puntos de entrega): el operario los
-- consulta al crear/editar despachos y en el panel de manifiestos. Solo READ —
-- la gestión administrativa del catálogo queda reservada para ADMIN.
--
-- Manifiestos: el operario crea y mantiene manifiestos de carga operativos.

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
CROSS JOIN permiso p
WHERE r.nombre = 'OPERARIO'
  AND p.codigo IN (
      'AGENCIAS_READ',
      'COURIERS_ENTREGA_READ',
      'PUNTOS_ENTREGA_READ',
      'MANIFIESTOS_READ',
      'MANIFIESTOS_WRITE'
  )
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
