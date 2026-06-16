-- Etiqueta organizativa OPCIONAL del destinatario/consignatario. Texto libre,
-- separada del nombre (que sigue siendo la persona que recibe). No es enum, no
-- es única, no genera código y no se backfillea desde el nombre.

ALTER TABLE consignatario ADD COLUMN etiqueta VARCHAR(60);

-- El historial SCD2 guarda todos los datos editables del maestro; la etiqueta
-- también se versiona. NO se copia a documentos/snapshots logísticos.
ALTER TABLE consignatario_version ADD COLUMN etiqueta VARCHAR(60);
