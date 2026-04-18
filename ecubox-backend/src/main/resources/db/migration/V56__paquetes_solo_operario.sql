-- "Gestión de paquetes" pasa a ser un módulo exclusivo del operario.
-- El cliente final sigue accediendo a sus envíos a través de "Mis guías"
-- (permisos MIS_GUIAS_*), por lo que ya no necesita los permisos PAQUETES_*.

DELETE FROM rol_permiso
WHERE rol_id = (SELECT id FROM rol WHERE nombre = 'CLIENTE')
  AND permiso_id IN (
      SELECT id FROM permiso
      WHERE codigo IN ('PAQUETES_READ', 'PAQUETES_CREATE', 'PAQUETES_UPDATE', 'PAQUETES_DELETE')
  );
